const express = require('express');
const router = express.Router();
const {
    getAboutPageConfig,
    updateAboutPageConfig
} = require('../controllers/aboutPageController');

const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');
const memoryUpload = require('../middlewares/uploadMiddleware');
const { uploadToCloudinary } = require('../middlewares/cloudinaryUploader');

// Public route to fetch About Page config
router.get('/', getAboutPageConfig);

// Admin protected route to update About Page config
const adminOnly = [protect, admin, checkAdminAccess];
router.put(
    '/',
    adminOnly,
    memoryUpload.any(),
    uploadToCloudinary,
    updateAboutPageConfig
);

module.exports = router;
