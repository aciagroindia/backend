const express = require("express");
const router = express.Router();

const { getAdminAnalytics } = require("../controllers/analyticsController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");

const adminOnly = [protect, admin, checkAdminAccess];

router.get("/", adminOnly, getAdminAnalytics);

module.exports = router;