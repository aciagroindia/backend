const express = require("express");
const router = express.Router();
const aboutMediaController = require("../controllers/aboutMediaController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");
const memoryUpload = require("../middlewares/uploadMiddleware");
const { uploadToCloudinary } = require("../middlewares/cloudinaryUploader");

// Public routes
router.get("/", aboutMediaController.getAboutMedia);

// Admin routes
const adminOnly = [protect, admin, checkAdminAccess];

router.post("/", adminOnly, memoryUpload.single("file"), uploadToCloudinary, aboutMediaController.createAboutMedia);
router.delete("/:id", adminOnly, aboutMediaController.deleteAboutMedia);

module.exports = router;
