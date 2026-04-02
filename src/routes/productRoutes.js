const express = require('express');
const router = express.Router();
const { 
    getProducts, 
    getProductBySlug,
    getBestSellers, 
    getRelatedProducts,
    createProduct, 
    updateProduct, 
    deleteProduct,
} = require('../controllers/productController');
const { protect, admin, optionalProtect } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');
const memoryUpload = require('../middlewares/uploadMiddleware');
const { uploadToCloudinary } = require('../middlewares/cloudinaryUploader');
const createError = require('http-errors');
const { validate } = require('../middlewares/validationMiddleware');
const { createProduct: createProductSchema, updateProductBody, objectIdParam } = require('../validations/product.validation');

router.get('/', getProducts);
router.get('/best-sellers', getBestSellers);
router.get('/related/:slug', getRelatedProducts);
router.get('/:slug', optionalProtect, getProductBySlug); // For your product detail links

const adminOnly = [protect, admin, checkAdminAccess];

router.post(
    '/', 
    adminOnly,
    memoryUpload.any(), 
    (req, res, next) => {
        // With .any(), req.files is an array of all uploaded files.
        if (!req.files || req.files.length === 0) {
            console.warn("🚩 Product upload failed: No files received.");
            console.warn("🚩 Received Body Fields:", Object.keys(req.body));
            return next(createError(400, 'At least one product image is required.'));
        }
        next();
    },
    validate(createProductSchema),
    createProduct
);

router.put(
    '/:id', 
    adminOnly,
    memoryUpload.any(), 
    (req, res, next) => {
        // req.files will contain any newly uploaded files.
        next();
    },
    validate(objectIdParam, 'params'),
    validate(updateProductBody),
    updateProduct
);
router.delete(
    '/:id', 
    adminOnly, 
    validate(objectIdParam, 'params'), 
    deleteProduct
);

module.exports = router;