// @desc    Get Related Products (People Also Bought)
// @route   GET /api/products/related/:slug
exports.getRelatedProducts = async (req, res, next) => {
    try {
        // Find the current product to identify its category
        const currentProduct = await Product.findOne({
            slug: req.params.slug
        }).select('_id category');

        if (!currentProduct) {
            throw createError(404, "Product not found");
        }

        // Fetch up to 4 active and in-stock products
        // from the same category, excluding the current product
        const products = await Product.find({
            category: currentProduct.category,
            _id: { $ne: currentProduct._id },
            status: 'Active',
            stock: { $gt: 0 }
        })
        .limit(4)
        .select('_id name slug price image images rating stock status');

        res.json({
            success: true,
            products
        });
    } catch (error) {
        next(error);
    }
};
