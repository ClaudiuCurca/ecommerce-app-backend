const AppError = require("../utils/appError");
const Product = require("./../models/ProductModel");
const Review = require("./../models/ReviewModel");

const MAX_REVIEWS_PER_PAGE = 10;

exports.getAllReviews = async (req, res, next) => {
  try {
    let query = Review.find(
      req.params.productId
        ? { product: req.params.productId }
        : { user: req.params.userId }
    ).sort(req.query.sort);

    // Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit || MAX_REVIEWS_PER_PAGE;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numReviews = await Product.countDocuments();
      if (skip > numReviews) {
        next(new AppError("This page does not exist", 404));
      }
    }

    const maxResults = await Review.countDocuments({
      product: req.params.productId,
    });

    const reviews = await query;

    res.status(200).json({
      maxResults,
      status: "success",
      data: reviews,
    });
  } catch (err) {
    next(err);
  }
};

exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: review,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    // updating can be done only by review creator.
    const isAuthorizedToUpdate =
      req.user._id.toString() === review.user._id.toString();

    if (!isAuthorizedToUpdate) {
      return next(new AppError("You are not the author of this review", 1));
    }

    const product = await Product.findById(review.product);
    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    // if i change the rating then i need to also change the avg rating on the product
    if (req.body.rating) {
      product.updateReviewAndCalcAverage(review.rating, req.body.rating);
    }

    review.rating = req.body.rating || review.rating;
    review.review = req.body.review || review.review;

    await review.validate();
    await review.save();
    await product.save();

    res.status(200).json({
      status: "success",
      data: review,
    });
  } catch (err) {
    next(err);
  }
};

exports.createReview = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return next(
        new AppError(
          "The product for which you want to create a review does not exist",
          404
        )
      );
    }

    const existingReivew = await Review.findOne({
      user: req.user._id,
      product: req.params.productId,
    });

    if (existingReivew) {
      return next(
        new AppError("You have already written a review for this product", 409)
      );
    }

    const newReview = await Review.create({
      productName: product.name,
      product: req.params.productId,
      rating: req.body.rating,
      review: req.body.review,
      user: req.user._id,
    });

    product.reviews.push(newReview);
    product.addReviewAndCalcAverage(newReview.rating * 1);

    await product.save();

    res.status(200).json({
      status: "success",
      data: newReview,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const reviewToDelete = await Review.findById(req.params.reviewId);
    if (!reviewToDelete) {
      return next(new AppError("There is no review with this id", 404));
    }

    const productToUpdate = await Product.findById(reviewToDelete.product);
    if (!productToUpdate) {
      return next(new AppError("The product with this id does not exist", 404));
    }

    // if user isn't admin OR user isn't review creator then can't delete
    const isAuthorized =
      req.user.isAdmin ||
      req.user._id.toString() === reviewToDelete.user._id.toString();

    if (!isAuthorized) {
      return next(
        new AppError("You are not authorized to delete this review", 401)
      );
    }

    productToUpdate.reviews = productToUpdate.reviews.filter(
      (review) => review._id.toString() !== reviewToDelete._id.toString()
    );

    productToUpdate.deleteReviewAndCalcAverage(reviewToDelete.rating * 1);

    await productToUpdate.save();

    await reviewToDelete.deleteOne();

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.likeReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (review.user._id.toString() === req.user._id.toString()) {
      return next(new AppError("You can not like your own review.", 400));
    }

    if (!review) {
      return next(new AppError("This review does not exist.", 404));
    }

    if (review.whoLiked.includes(req.user._id)) {
      return next(new AppError("You already liked this review", 400));
    }

    review.whoLiked.push(req.user._id);
    review.likes += 1;

    await review.save();

    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.unlikeReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return next(new AppError("This review does not exist.", 404));
    }

    if (review.whoLiked.includes(req.user._id) === false) {
      return next(new AppError("You have not liked this review.", 400));
    }

    // deleting users from reviews.whoLiked
    review.whoLiked = review.whoLiked.filter(
      (user) => user.toString() !== req.user._id.toString()
    );

    review.likes -= 1;

    await review.save();

    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
