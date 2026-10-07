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

// @desc    Get Top 12 Best Selling Products (Prioritizes Admin Choices)
// @route   GET /api/products/best-sellers
exports.getBestSellers = async (req, res, next) => {
    try {
        // 1. Fetch products explicitly marked as Best Sellers by Admin
        let products = await Product.find({ 
            status: 'Active', 
            isBestSeller: true 
        })
        .sort({ bestSellerOrder: 1, updatedAt: -1 })
        .limit(12)
        .select('_id name slug price image images rating salesCount stock status isBestSeller packages unit');

        // 2. If fewer than 12 manually selected, backfill with top selling / highest rated products
        if (products.length < 12) {
            const existingIds = products.map(p => p._id);
            const remainingCount = 12 - products.length;

            const autoProducts = await Product.find({
                _id: { $nin: existingIds },
                status: 'Active',
            })
            .sort({ salesCount: -1, rating: -1, createdAt: -1 })
            .limit(remainingCount)
            .select('_id name slug price image images rating salesCount stock status isBestSeller packages unit');

            products = [...products, ...autoProducts];
        }

        res.json({
            success: true,
            products,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle Best Seller status for product
// @route   PATCH /api/products/:id/toggle-bestseller
exports.toggleBestSeller = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            throw createError(404, "Product not found");
        }
        product.isBestSeller = !product.isBestSeller;
        await product.save();

        res.json({
            success: true,
            message: `Product ${product.isBestSeller ? 'marked as' : 'removed from'} Best Seller`,
            isBestSeller: product.isBestSeller,
            product,
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
            _id: { $ne: currentProduct._id }
        })
        .limit(4)
        .select('_id name slug price image images rating stock status');

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

        let descriptionSectionsInput = productData.descriptionSections;
        if (typeof descriptionSectionsInput === 'string') {
            if (descriptionSectionsInput.includes('[object Object]') || descriptionSectionsInput.trim() === '') {
                productData.descriptionSections = [];
            } else {
                try {
                    productData.descriptionSections = JSON.parse(descriptionSectionsInput);
                } catch (e) {
                    throw createError(400, 'Invalid format for Description Sections. Must be valid JSON.');
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

        if (Object.prototype.hasOwnProperty.call(updateData, 'descriptionSections')) {
            let descSecInput = updateData.descriptionSections;
            if (typeof descSecInput === 'string') {
                if (descSecInput.includes('[object Object]') || descSecInput.trim() === '') {
                    updateData.descriptionSections = [];
                } else {
                    try {
                        updateData.descriptionSections = JSON.parse(descSecInput);
                    } catch (e) {
                        throw createError(400, 'Invalid format for Description Sections. Must be valid JSON.');
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