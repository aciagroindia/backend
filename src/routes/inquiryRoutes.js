const express = require("express");
const router = express.Router();
const inquiryController = require("../controllers/inquiryController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");

// Public routes
router.post("/", inquiryController.createInquiry);

module.exports = router;
