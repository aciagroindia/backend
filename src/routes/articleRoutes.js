const express = require('express');
const router = express.Router();
const {
    getArticles,
    getArticleBySlug,
    createArticle,
    updateArticle,
    deleteArticle
} = require('../controllers/articleController');

const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');
const memoryUpload = require('../middlewares/uploadMiddleware');
const { uploadToCloudinary } = require('../middlewares/cloudinaryUploader');

// Public routes
router.get('/', getArticles);
router.get('/:slug', getArticleBySlug);

// Admin protected routes
const adminOnly = [protect, admin, checkAdminAccess];

router.post('/', adminOnly, memoryUpload.single('image'), uploadToCloudinary, createArticle);
router.put('/:id', adminOnly, memoryUpload.single('image'), uploadToCloudinary, updateArticle);
router.delete('/:id', adminOnly, deleteArticle);

module.exports = router;
