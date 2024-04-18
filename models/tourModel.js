const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

const opts = {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'tours',
};

const toursSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [
        40,
        'The name was too long. Try by specifying a name less than 40 characters :)',
      ],
      minLength: [5, 'Try by making it at least 5 characters long :)'],
      validator: [validator.isAlpha, 'the name should be only normal letters '],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'tour should have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'hard', 'difficult'],
        message: 'Valid difficulties are: easy, medium, hard and difficult',
      },
    },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating should be greater than 1'],
      max: [5, 'rating should be below 5'],
      set: (average) => average.toFixed(1),
    },
    ratingsQuantity: { type: Number, default: 0 },
    priceDiscount: {
      type: Number,
      validate: {
        // This only points to the current doc on NEW document creation
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary!'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have an image cover!!!'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  opts,
);
// SETTING AN INDEX
// toursSchema.index({ price: 1 });
toursSchema.index({ price: 1, ratingsAverage: -1 });
toursSchema.index({ slug: 1 });
toursSchema.index({ startLocation: '2dsphere' });

// VIRTUAL PROPERTIES
toursSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

toursSchema.virtual('reviews', {
  ref: 'review',
  foreignField: 'tour',
  localField: '_id',
});

// DOCUMENT MIDDLEWARE
toursSchema.pre('save', async function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// QUERY MIDDLEWARE
toursSchema.pre(/^find/, function (next) {
  // toursSchema.pre('find', function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// For populating documents
toursSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

toursSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds :)`);
  next();
});

// AGGREGATION MIDDLEWARE
// toursSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({
//     $match: { secretTour: { $ne: true } },
//   });
//   next();
// });

const TourModel = mongoose.model('tours', toursSchema);

module.exports = TourModel;
