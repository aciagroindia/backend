const express = require('express');
const router = express.Router();
const { 
    getBulkBanners, 
    createBulkBanner, 
    updateBulkBanner, 
    deleteBulkBanner 
} = require('../controllers/bulkBannerController');

const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');
const memoryUpload = require('../middlewares/uploadMiddleware');
const { uploadToCloudinary } = require('../middlewares/cloudinaryUploader');
const createError = require('http-errors');

// Public Route
router.get('/', getBulkBanners);

// Admin Protected Routes
const adminOnly = [protect, admin, checkAdminAccess];

router.post('/', adminOnly, memoryUpload.single('image'), (req, res, next) => {
    if (!req.file) {
        return next(createError(400, 'Banner image is required.'));
    }
    next();
}, uploadToCloudinary, createBulkBanner);

router.put('/:id', adminOnly, memoryUpload.single('image'), uploadToCloudinary, updateBulkBanner);

router.delete('/:id', adminOnly, deleteBulkBanner);

module.exports = router;
