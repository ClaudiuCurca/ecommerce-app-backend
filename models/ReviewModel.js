const mongoose = require("mongoose");
const Product = require("./ProductModel");

const reviewSchema = mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: [true, "Review must belong to a Product."],
    },
    productName: {
      type: String,
      required: [true, "Review must have the product name."],
    },
    rating: {
      type: Number,
      min: [1, "Review value must be between 1 and 5"],
      max: [5, "Review value must be between 1 and 5"],
    },
    review: {
      type: String,
      required: [true, "A review can not be empty"],
      maxlength: [1000, "A review  must have a maximum of 1000 letters"],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user."],
    },
    likes: { type: Number, default: 0 },
    whoLiked: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo",
  });

  next();
});

// when user is deleted all his reviews are deleted
reviewSchema.pre("deleteMany", async function (next) {
  const filter = this.getFilter();

  try {
    const reviews = await this.model.find(filter);

    reviews.forEach(async (review) => {
      const productToUpdate = await Product.findById(review.product);
      productToUpdate.reviews = productToUpdate.reviews.filter(
        (review) => review._id.toString() !== review._id.toString()
      );
      productToUpdate.deleteReviewAndCalcAverage(review.rating * 1);
      await productToUpdate.save();
    });

    next();
  } catch (error) {
    console.error("Error updating product reviews:", error);
    next(error);
  }
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
