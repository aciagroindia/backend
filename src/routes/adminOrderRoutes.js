const express = require('express');
const router = express.Router();

// Import controller functions
const {
    getOrders, 
    getOrderById,
    updateOrderStatus,
    shipOrder,
    shiprocketWebhook,
    trackOrder,
    deleteOrder,
    cleanupCancelledOrders,
    bulkDeleteOrders
} = require('../controllers/adminOrderController');

// Import authentication middleware
const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');

// Admin order routes
const adminOnly = [protect, admin, checkAdminAccess];

// ==========================================
// 🔔 SHIPROCKET WEBHOOK ROUTE 
// ==========================================
router.post('/webhook/tracking', shiprocketWebhook); 

// Cleanup and Bulk Delete Routes (must be before /:id)
router.delete('/cleanup/cancelled', adminOnly, cleanupCancelledOrders);
router.post('/bulk-delete', adminOnly, bulkDeleteOrders);

// Baaki saare admin routes
router.route('/')
    .get(adminOnly, getOrders); // GET /api/admin/orders

router.route('/:id')
    .get(adminOnly, getOrderById) // GET /api/admin/orders/:id
    .delete(adminOnly, deleteOrder); // DELETE /api/admin/orders/:id

router.route('/:id/status')
    .put(adminOnly, updateOrderStatus); // PUT /api/admin/orders/:id/status

router.route('/:id/ship')
    .post(adminOnly, shipOrder); // POST /api/admin/orders/:id/ship

// 👇 🚀 NAYA ROUTE: TRACKING KE LIYE (404 Error Fix) 👇
router.route('/:id/track')
    .get(adminOnly, trackOrder); // GET /api/admin/orders/:id/track

module.exports = router;