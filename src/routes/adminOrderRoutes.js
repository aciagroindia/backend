const express = require('express');
const router = express.Router();

// Import controller functions
const {
    getOrders, 
    getOrderById,
    updateOrderStatus,
    shipOrder,
    shiprocketWebhook // 👈 Fix 1: Webhook function import kiya
} = require('../controllers/adminOrderController');

// Import authentication middleware
const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');

// Admin order routes
const adminOnly = [protect, admin, checkAdminAccess];

// ==========================================
// 🔔 SHIPROCKET WEBHOOK ROUTE 
// Dhyan de: Ispe 'adminOnly' middleware NAHI lagana hai!
// ==========================================
router.post('/webhook/tracking', shiprocketWebhook); // 👈 Fix 2: Route add kiya

// Baaki saare admin routes
router.route('/')
    .get(adminOnly, getOrders); // GET /api/admin/orders

router.route('/:id')
    .get(adminOnly, getOrderById); // GET /api/admin/orders/:id

router.route('/:id/status')
    .put(adminOnly, updateOrderStatus); // PUT /api/admin/orders/:id/status

router.route('/:id/ship')
    .post(adminOnly, shipOrder); // POST /api/admin/orders/:id/ship

module.exports = router;