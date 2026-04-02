const express = require('express');
const router = express.Router();
const { getOrderById } = require('../controllers/adminOrderController');

// Import authentication middleware
const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');
const adminOnly = [protect, admin, checkAdminAccess];

// This router handles routes that are not prefixed with /api for the admin panel
// to accommodate frontend inconsistencies.

// GET /admin/orders/:id
router.get('/orders/:id', adminOnly, getOrderById);

module.exports = router;