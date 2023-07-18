const express = require("express");
const router = express.Router();

const userController = require("./../controllers/userController");
const reviewController = require("./../controllers/reviewController");

// unrestricted routes
router.get("/product/:productId", reviewController.getAllReviews);
router.get("/:reviewId", reviewController.getReview);
router.get("/user/:userId", reviewController.getAllReviews);

// user routes
router.use(userController.verifyIsLoggedIn);

router.post("/product/:productId/createReview", reviewController.createReview);

router
  .route("/:reviewId/like")
  .post(reviewController.likeReview) // sending POST means like
  .delete(reviewController.unlikeReview); //sending DELETE means unlike

// shared admin and user routes
router
  .route("/:reviewId")
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;
