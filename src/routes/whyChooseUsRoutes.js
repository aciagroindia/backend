const express = require('express');
const router = express.Router();
const {
    getWhyChooseUs,
    updateWhyChooseUs
} = require('../controllers/whyChooseUsController');

const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');
const memoryUpload = require('../middlewares/uploadMiddleware');
const { uploadToCloudinary } = require('../middlewares/cloudinaryUploader');

// Public route to fetch configuration
router.get('/', getWhyChooseUs);

// Admin protected route to update
const adminOnly = [protect, admin, checkAdminAccess];
router.put(
    '/',
    adminOnly,
    memoryUpload.single('image'),
    uploadToCloudinary,
    updateWhyChooseUs
);

module.exports = router;
