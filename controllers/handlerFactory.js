const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document)
      return next(new AppError('No document found with that ID', 404));

    res.status(204).json({
      status: 'successful',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updatedDocument = await Model.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        timestamps: true,
        runValidators: true,
      },
    );
    if (!updatedDocument)
      return next(new AppError('No document found with that ID', 404));

    res.status(201).json({
      status: 'successful',
      data: { updatedDocument },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // 1) Take request body for creating a document
    const newDocument = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        document: newDocument,
      },
    });
  });

exports.readOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const document = await query;
    if (!document) return next(new AppError('No tour found with that ID', 404));

    res.status(201).json({
      status: 'successful uwu',
      data: {
        document,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limiting()
      .pagination();
    const document = await features.query;

    res.status(201).json({
      status: 'successful uwu',
      results: document.length,
      data: {
        document,
      },
    });
  });
