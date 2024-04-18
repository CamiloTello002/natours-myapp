const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// const sendEmail = require('../utils/email');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    // expiresIn: process.env.JWT_EXPIRES_IN * 1,
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // This is the key... You're sending the JWT inside a cookie :)
  res.cookie('jwt', token, {
    expiresIn: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    secure: process.env.NODE_ENVIRONMENT === 'production',
    httpOnly: true,
  });

  // Remove the password...
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(req.body);
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  // Here you can send the email
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(`req.get('host') is ${req.get('host')}`);
  console.log(`req.hostname is ${req.hostname}`);

  const welcomeEmail = new Email(newUser, url).sendWelcome();
  // We must await for this promise before sending the token
  await welcomeEmail;
  // ---------------------------
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide an email and a password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expiresIn: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  // in case there's no token in the authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // This is the code that extracts the token
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // If it wasn't in the header, then check the cookies...
    token = req.cookies.jwt;
  }
  if (!token)
    return next(
      new AppError('You are not logged in! Please log in to get access', 401),
    );

  // 2) Verify the token (checks if token hasn't been tampered)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists (remember that someone could take a user that no longer exists)
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return next(new AppError('User not found!', 401));

  // 4) Check if user changed the password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Password has been changed. Please log in again', 401),
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  res.locals.user = currentUser;
  req.user = currentUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  // check for jwt in cookie
  if (req.cookies.jwt) {
    try {
      // console.log("there's a cookie!");
      // verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next(new AppError('User not found!', 401));

      // check if user has changed the password
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
          new AppError('Password has been changed. Please log in again', 401),
        );
      }

      res.locals.user = currentUser;
      // use RETURN to finish execution on a line
      // Otherwise, you'll end up calling next() TWICE.
      return next();
    } catch (err) {
      return next();
    }
  }
  // if there's no cookie, then just go on
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You don't have permission to perform this action!", 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  // remember that email will be sent in the payload
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError("The user doesn't exist!", 404));

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email

  try {
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetUrl).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to mail!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500,
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token.
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user)
    return next(new AppError('Invalid token or token has expired :(', 404));
  // 2) If token hasn't expired and there is a user, set the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;

  await user.save();
  // 3) Update the changedPasswordAt property for the user
  // 4) Log the user in and send JWT to the client.
  createSendToken(user, 200, res);
});

// This is only for logged users
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token)
    return next(
      new AppError(
        'You are not logged in. Please log in to change password',
        401,
      ),
    );

  // 2) Verify the token (checks if token hasn't been tampered)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // get user from promise
  const currentUser = await User.findById(decoded.id).select('+password');
  if (!currentUser) return next(new AppError('User not found!', 401));
  if (
    !currentUser.correctPassword(req.body.passwordCurrent, currentUser.password)
  )
    return next(new AppError('Incorrect old password! Please try again', 401));
  currentUser.password = req.body.password;
  currentUser.passwordConfirm = req.body.passwordConfirm;
  await currentUser.save();
  createSendToken(currentUser, 201, res);
  // 3) If old password matches, then it'll be changed
  // 4) Log in and send JWT
});
