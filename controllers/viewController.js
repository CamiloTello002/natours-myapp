const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from our collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});
exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data
  const tour = await Tour.findOne({ slug: req.params.tourSlug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  // 2) if a tour is not found, then throw an error
  if (!tour) return next(new AppError('There is no tour with that name!', 404));

  // 3) if found, then return it
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.login = (req, res) => {
  // Keep in mind that any data you retrieve MUST
  // be done here :)
  res.status(200).render('login', {
    title: 'login',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'user',
  });
};

exports.updateUserData = catchAsync(async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render('account', {
    title: 'user',
    user: updatedUser,
  });
});
