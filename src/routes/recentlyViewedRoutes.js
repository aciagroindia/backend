const express = require("express");
const router = express.Router();

const {
  addRecentlyViewed,
  getRecentlyViewed
} = require("../controllers/recentlyViewedController");

const { protect } = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validationMiddleware");
const { addRecentlyViewedSchema } = require("../validations/recentlyViewed.validation");

router.post("/", protect, validate(addRecentlyViewedSchema), addRecentlyViewed);

router.get("/", protect, getRecentlyViewed);

module.exports = router;