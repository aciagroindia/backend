const express = require('express');
const router = express.Router();
const {
    getWhatsAppConfig,
    updateWhatsAppConfig
} = require('../controllers/whatsAppController');

const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');

// Public route to get whatsapp config
router.get('/whatsapp', getWhatsAppConfig);

// Admin protected route to update whatsapp config
router.put('/whatsapp', protect, admin, checkAdminAccess, updateWhatsAppConfig);

module.exports = router;
