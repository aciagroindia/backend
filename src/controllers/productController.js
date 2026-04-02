const Product = require('../models/Product');
const createError = require('http-errors');
const productService = require('../services/product.service');

// @desc    Get All Products with Sorting and Filtering
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
    try {
        const queryParams = { ...req.query };
        
        // If an admin is requesting, they might want to see inactive products too.
        // We can check if req.user exists and is an admin.
        if (req.user && req.user.role === 'admin') {
            queryParams.includeInactive = true;
        }

        const products = await productService.getAllProducts(queryParams);
        res.json(products);
    } catch (error) {
        next(error);
    }
};

// @desc    Get Top 10 Best Selling Products
// @route   GET /api/products/best-sellers
exports.getBestSellers = async (req, res, next) => {
    try {
        const products = await Product.find({ status: 'Active' })
            .sort({ salesCount: -1 })
            .limit(10)
            .select('_id name slug price image images rating salesCount');

        res.json({
            success: true,
            products,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Related Products (People Also Bought)
// @route   GET /api/products/related/:slug
exports.getRelatedProducts = async (req, res, next) => {
    try {
        // Find the current product to identify its category
        const currentProduct = await Product.findOne({ slug: req.params.slug }).select('_id category');
        if (!currentProduct) {
            throw createError(404, "Product not found");
        }

        // Fetch up to 4 products from the same category, excluding the current one
        const products = await Product.find({
            category: currentProduct.category,
            status: 'Active',
            _id: { $ne: currentProduct._id }
        })
        .limit(4)
        .select('_id name slug price image images rating');

        res.json({ success: true, products });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Single Product by Slug (For Product Details Page)
// @route   GET /api/products/:slug
exports.getProductBySlug = async (req, res, next) => {
    try {
        const includeInactive = req.user && req.user.role === 'admin';
        const product = await productService.getProductBySlug(req.params.slug, includeInactive);
        res.json(product);
    } catch (error) {
        next(error);
    }
};

// @desc    Create Product
exports.createProduct = async (req, res, next) => {
    try {
        const productData = { ...req.body };
 
        let faqsInput = productData.faqs;

        if (typeof faqsInput === 'string') {
            if (faqsInput.includes('[object Object]') || faqsInput.trim() === '') {
                productData.faqs = [];
            } else {
                try {
                    productData.faqs = JSON.parse(faqsInput);
                } catch (e) {
                    throw createError(400, 'Invalid format for FAQs. Must be valid JSON.');
                }
            }
        }

        let packagesInput = productData.packages;
        if (typeof packagesInput === 'string') {
            if (packagesInput.includes('[object Object]') || packagesInput.trim() === '') {
                productData.packages = [];
            } else {
                try {
                    productData.packages = JSON.parse(packagesInput);
                } catch (e) {
                    throw createError(400, 'Invalid format for Packages. Must be valid JSON.');
                }
            }
        }
 
        const product = await productService.createProduct(productData, req.files);
        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
};
 
// @desc    Update Product
exports.updateProduct = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
 
        // Handle 'faqs' field only if it was included in the request payload.
        if (Object.prototype.hasOwnProperty.call(updateData, 'faqs')) {
            let faqsInput = updateData.faqs;
            if (typeof faqsInput === 'string') {
                if (faqsInput.includes('[object Object]') || faqsInput.trim() === '') {
                    updateData.faqs = [];
                } else {
                    try {
                        updateData.faqs = JSON.parse(faqsInput);
                    } catch (e) {
                        throw createError(400, 'Invalid format for FAQs. Must be valid JSON.');
                    }
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(updateData, 'packages')) {
            let packagesInput = updateData.packages;
            if (typeof packagesInput === 'string') {
                if (packagesInput.includes('[object Object]') || packagesInput.trim() === '') {
                    updateData.packages = [];
                } else {
                    try {
                        updateData.packages = JSON.parse(packagesInput);
                    } catch (e) {
                        throw createError(400, 'Invalid format for Packages. Must be valid JSON.');
                    }
                }
            }
        }
 
        console.log("📝 Update Product Request:", { id: req.params.id, body: req.body, fileCount: req.files ? req.files.length : 0 });
        const updatedProduct = await productService.updateProduct(req.params.id, updateData, req.files);
        res.json(updatedProduct);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete Product
exports.deleteProduct = async (req, res, next) => {
    try {
        const result = await productService.deleteProduct(req.params.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};