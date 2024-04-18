const mongoose = require('mongoose');
const Tour = require('./tourModel');

// aslkdjfkasdfj
// 1) Create the schema
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    tour: {
      // Schema.ObjectId and Schema.Types.ObjectId
      // yield the same result
      type: mongoose.Schema.Types.ObjectId,
      ref: 'tours',
      required: [true, 'Review must belong to a tour'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating || 0,
      ratingsQuantity: stats[0].nRatings || 4.5,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

// DOCUMENT MIDDLEWARE
// calculate average right after saving a review
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

// prevent saving a duplicate review
reviewSchema.pre('save', async function () {
  // 1) query the document with the given tour
  const tourReviewed = await Tour.findById(this.tour).select('+reviews');
  console.log(`The review should be: ${this}`);
  console.log(`And the tour should be: ${tourReviewed}`);
  console.log(`The found tour has ${tourReviewed.ratingsQuantity} reviews`);
});

// QUERY MIDDLEWARE
// populating document before showing it to the user
reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name photo' });
  next();
});

// calculating average after an update in the review
reviewSchema.post(/^findOneAnd/, async function (doc) {
  await doc.constructor.calcAverageRatings(doc.tour);
});

const reviewModel = mongoose.model('review', reviewSchema);

module.exports = reviewModel;
