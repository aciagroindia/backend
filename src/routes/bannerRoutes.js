const express = require('express');
const router = express.Router();
const { 
    getBanners, 
    createBanner, 
    updateBanner, 
    deleteBanner 
} = require('../controllers/bannerController');

const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');
const memoryUpload = require('../middlewares/uploadMiddleware');
const { uploadToCloudinary } = require('../middlewares/cloudinaryUploader');
const createError = require('http-errors');

// Public Route
router.get('/', getBanners);

// Admin Protected Routes
const adminOnly = [protect, admin, checkAdminAccess];

router.post('/', adminOnly, memoryUpload.single('image'), (req, res, next) => {
    if (!req.file) {
        return next(createError(400, 'Banner image is required.'));
    }
    next();
}, uploadToCloudinary, createBanner);

router.put('/:id', adminOnly, memoryUpload.single('image'), uploadToCloudinary, updateBanner);

router.delete('/:id', adminOnly, deleteBanner);

module.exports = router;