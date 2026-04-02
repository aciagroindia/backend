const express = require("express");
const router = express.Router();
const { 
    requestAdminAccess, 
    approveAdminViaEmail, 
    rejectAdminViaEmail 
} = require("../controllers/adminRequestController");
const { protect } = require("../middlewares/authMiddleware");

// Admin request bhejta hai (Protected)
router.post("/request", protect, requestAdminAccess);

// YE ROUTES EMAIL KE LIYE HAIN (No Auth needed directly via Token/ID)
// Ab raw ID ki jagah secure token ka istemal hoga
router.get("/email-approve/:token", approveAdminViaEmail);
router.get("/email-reject/:token", rejectAdminViaEmail);

module.exports = router;