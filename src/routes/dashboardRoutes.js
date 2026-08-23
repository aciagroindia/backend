const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");

// All dashboard routes should be protected and accessible only by approved admins.
const adminOnly = [protect, admin, checkAdminAccess];

router.get(
  "/stats",
  adminOnly,
  dashboardController.getDashboardStats
);

router.get(
  "/sales-chart",
  adminOnly,
  dashboardController.getSalesChart
);

router.get(
  "/recent-orders",
  adminOnly, 
  dashboardController.getRecentOrders
);

router.get(
  "/new-customers",
  adminOnly,
  dashboardController.getNewCustomers
);

module.exports = router;