const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A product must have a name"],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "A product must have a description"],
    },
    category: {
      type: String,
      required: [true, "A product must belong to a category"],
    },
    count: {
      type: Number,
      required: [true, "A product must have a count"],
    },
    price: {
      type: Number,
      required: [true, "A product must have a price"],
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviewsNumber: {
      type: Number,
      default: 0,
    },
    sales: {
      type: Number,
      default: 0,
    },
    attrs: [{ key: { type: String }, value: { type: String } }],
    images: [String],
    imageCover: { type: String, default: "product-default.jpg" },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
  },
  {
    timestamps: true,
  }
);

productSchema.methods.addReviewAndCalcAverage = function (newReviewRating) {
  if (this.reviewsNumber === 0) {
    this.rating = newReviewRating;
    this.reviewsNumber = 1;
  } else {
    const totalRating = this.rating * this.reviewsNumber;
    this.rating = (totalRating + newReviewRating) / (this.reviewsNumber + 1);
    this.reviewsNumber += 1;
  }
};

productSchema.methods.deleteReviewAndCalcAverage = function (ratingToDelete) {
  if (this.reviewsNumber === 1) {
    this.reviewsNumber = 0;
    this.rating = 0;
  } else {
    const totalRating = this.rating * this.reviewsNumber;
    this.rating = (totalRating - ratingToDelete) / (this.reviewsNumber - 1);
    this.reviewsNumber -= 1;
  }
};

productSchema.methods.updateReviewAndCalcAverage = function (
  oldRating,
  newRating
) {
  if (this.reviewsNumber === 1) {
    this.rating = newRating;
  } else {
    const totalRating = this.rating * this.reviewsNumber;
    this.rating = (totalRating - oldRating + newRating) / this.reviewsNumber;
    console.log(this.rating);
  }
};

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
