const express = require("express");
const router = express.Router();

const {
  createReview,
  getProductReviews,
  getHomepageTestimonials,
} = require("../controllers/reviewController");

const { protect } = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validationMiddleware");
const { createReviewSchema, getProductReviewsSchema } = require("../validations/review.validation");

router.get("/testimonials", getHomepageTestimonials);

router.post("/", protect, validate(createReviewSchema), createReview);

router.get("/:productId", validate(getProductReviewsSchema, 'params'), getProductReviews);

module.exports = router;