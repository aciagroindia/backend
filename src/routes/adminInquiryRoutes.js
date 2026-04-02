const express = require("express");
const router = express.Router();
const inquiryController = require("../controllers/inquiryController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");

// Admin routes for inquiries
const adminOnly = [protect, admin, checkAdminAccess];

router.get("/", adminOnly, inquiryController.getInquiries); // GET /api/admin/inquiries
router.patch("/:id", adminOnly, inquiryController.updateInquiryStatus); // PATCH /api/admin/inquiries/:id

module.exports = router;