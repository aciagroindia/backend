const express = require("express");
const router = express.Router();

const wishlistController = require("../controllers/wishlistController");
const authMiddleware = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validationMiddleware");
const { toggleWishlistSchema } = require("../validations/wishlist.validation");

// Helper: Agar authMiddleware ek object hai jisme 'protect' function hai, 
// toh hum protect use karenge, warna pura middleware function.
const protect = authMiddleware.protect || authMiddleware;

// Routes
router.get("/", protect, wishlistController.getWishlist);

router.post(
    "/toggle", 
    protect, 
    validate(toggleWishlistSchema), 
    wishlistController.toggleWishlist
);

module.exports = router;