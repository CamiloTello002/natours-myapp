const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // 1) There must be BOTH an image cover and images for the tour
  // console.log(req.files);
  console.log(req.files.images);
  if (!req.files.imageCover || !req.files.images) return next();

  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  // 2) process the cover image
  await sharp(req.files.imageCover[0].buffer)
    .resize({
      fit: sharp.fit.contain,
      width: 2000,
      height: 1333,
    })
    .jpeg({
      quality: 90,
      force: true,
    })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 3) process the images
  req.body.images = [];
  const imageUpload = req.files.images.map(async (file, index) => {
    // 3.1) create the corresponding filename
    const fileName = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`;
    await sharp(file.buffer)
      .resize({
        fit: sharp.fit.contain,
        width: 2000,
        height: 1333,
      })
      .jpeg({
        quality: 90,
        force: true,
      })
      .toFile(`public/img/tours/${fileName}`);
    req.body.images.push(fileName);
  });

  // await for all the promises
  await Promise.all(imageUpload);

  console.log(req.body.images);
  next();
});

exports.createTour = factory.createOne(Tour);
exports.getTour = factory.readOne(Tour, 'reviews');
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.getAllTours = factory.getAll(Tour);

/* Here we add some fields to the query object */
exports.aliasTopTours = async (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getTourStats = catchAsync(async (req, res, next) => {
  const pipeline = [
    { $match: { ratingsAverage: { $gte: 4.5 } } },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numDocuments: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: 1,
      },
    },
  ];
  const stats = await Tour.aggregate(pipeline);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = parseInt(req.params.year, 10);

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: '$_id',
      },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 5,
    },
  ]);

  res.status(200).json({
    status: 'success',
    number: plan.length,
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  // 1) extract the parameters
  const { distance, latlng, unit } = req.params;
  // 2) extract latitude and longitude
  const [lat, lng] = latlng.split(',');

  // the distance has to be divided by the radius of earth (depending on the unit)
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide a latitude and a longitude in the format lat, long',
        400,
      ),
    );
  }
  // console.log(distance, lat, lng, unit);
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  // 1) extract the parameters
  const { latlng, unit } = req.params;
  // 2) extract latitude and longitude
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide a latitude and a longitude in the format lat, long',
        400,
      ),
    );
  }
  // Calculate the distances
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    // This project stage is very useful, it removes all the clutter
    // when returning all the tour distances with respect
    // to a given point
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    // results: distances.length,
    data: {
      data: distances,
    },
  });
});
// router.route(
//   '/tours-within/:distance/center/:latlng/unit/:unit',
// 34.111777, -118.050382
//   tourController.getToursWithin,
// );
// /tours-within/233/center/34.111777,-118.050382/unit/mi
