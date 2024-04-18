const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// name, email, photo, password, passwordConfirm
const usersSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us your name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
      type: String,
      default: 'default.jpg',
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      // default: 'user',
      required: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minLength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        // This only works when we create a NEW object and SAVE
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  // if the collection doesn't exist, then MongoDB creates a new one
  { collection: 'users' },
);

// This parses plain text password to hashed password
usersSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete password confirm field (we wouldn't like to save the plain text password or encrypt it twice haha)
  this.passwordConfirm = undefined;
});

// This adds the updated password timestamp
usersSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // In case nothing above is true, then give the document that
  // timestamp
  this.passwordChangedAt = Date.now();
  next();
});

// Checks for inactive users
usersSchema.pre(/^find/, function (next) {
  // This points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// Built-in method for checking password
usersSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // We can't do this.password because we can't directly query the password. That's why it's the argument of the function
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Makes sure that the token hasn't expired
usersSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    // const changedTimeStamp = this.passwordChangedAt.getTime();

    return JWTTimestamp < changedTimestamp;
  }

  // False means not changed
  return false;
};

// Temporary token for password resetting
usersSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', usersSchema);

module.exports = User;
