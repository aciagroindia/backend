const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');
const memoryUpload = require('../middlewares/uploadMiddleware');
const { uploadToCloudinary } = require('../middlewares/cloudinaryUploader');
const createError = require('http-errors');
const { validate } = require('../middlewares/validationMiddleware');
const { 
    createCategorySchema, 
    updateCategorySchema, 
    objectIdParamSchema 
} = require('../validations/category.validation');

// Middleware for routes that require approved admin access
const adminOnly = [protect, admin, checkAdminAccess];

// Public route to get all categories
router.get('/', getCategories);
router.get('/:slug', (req, res, next) => {
    // Check if :slug is actually a slug or an ID
    // IDs are 24 chars hex normally.
    // If it's a slug, handle it.
    const { slug } = req.params;
    if (slug.length === 24 && /^[0-9a-fA-F]+$/.test(slug)) {
        return next(); // Let ID-based routes handle it if they exist (though we don't have one here yet)
    }
    next();
}, require('../controllers/categoryController').getCategoryBySlug);

// Admin-only routes
router.post(
    '/', 
    adminOnly, 
    memoryUpload.single('image'), // 1. Parse form and load file to memory
    (req, res, next) => { // 1.5. Custom middleware to check for file existence
        if (!req.file) {
            return next(createError(400, 'Category image is required.'));
        }
        next();
    },
    validate(createCategorySchema), // 2. Validate req.body (name, etc.)
    uploadToCloudinary, // 3. If validation passes, upload to Cloudinary from memory
    createCategory // 4. Save to DB
);

router.put('/:id', adminOnly, memoryUpload.single('image'), validate(objectIdParamSchema, 'params'), validate(updateCategorySchema), uploadToCloudinary, updateCategory);

router.delete('/:id', adminOnly, validate(objectIdParamSchema, 'params'), deleteCategory);

module.exports = router;
