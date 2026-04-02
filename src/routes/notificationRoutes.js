const express = require("express");
const router = express.Router();
const {
  getNotifications,
  clearNotification,
  clearAllNotifications,
} = require("../controllers/notificationController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");

const adminOnly = [protect, admin, checkAdminAccess];

router.get("/", adminOnly, getNotifications);
router.put("/clear-all", adminOnly, clearAllNotifications);
router.put("/:id/clear", adminOnly, clearNotification);

module.exports = router;
