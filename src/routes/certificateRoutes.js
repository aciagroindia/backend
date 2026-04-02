const express = require("express");
const router = express.Router();
const certificateController = require("../controllers/certificateController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");
const memoryUpload = require("../middlewares/uploadMiddleware");
const { uploadToCloudinary } = require("../middlewares/cloudinaryUploader");

// Public routes
router.get("/", certificateController.getCertificates);

// Admin routes
const adminOnly = [protect, admin, checkAdminAccess];

router.post("/", adminOnly, memoryUpload.single("image"), uploadToCloudinary, certificateController.createCertificate);
router.delete("/:id", adminOnly, certificateController.deleteCertificate);

module.exports = router;
