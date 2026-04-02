const RecentlyViewed = require("../models/RecentlyViewed");
const Product = require("../models/Product");
const createError = require("http-errors");

// ADD RECENTLY VIEWED PRODUCT
exports.addRecentlyViewed = async (req, res, next) => {
  try {
    const { productId } = req.body;

    // 1. Check if product exists to prevent dangling references
    const product = await Product.findById(productId);
    if (!product) {
      throw createError(404, "Product not found");
    }

    // 2. Use findOneAndUpdate with upsert for an atomic and efficient operation.
    // This will either create a new document or update the 'updatedAt' timestamp
    // of the existing one, effectively "bumping" it to the top of the list.
    await RecentlyViewed.findOneAndUpdate(
      { user: req.user.id, product: productId },
      { $set: { updatedAt: new Date() } }, // Explicitly set updatedAt to trigger sort
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "Product added to recently viewed"
    });
  } catch (error) {
    next(error);
  }
};

// GET RECENTLY VIEWED PRODUCTS
exports.getRecentlyViewed = async (req, res, next) => {
  try {
    const recentlyViewedItems = await RecentlyViewed
      .find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate({
        path: 'product',
        select: 'name slug price image rating' // Select only the fields needed for the UI
      })
      .lean(); // Use .lean() for faster read-only queries

    // Map the result to return an array of product objects directly,
    // and filter out any items where the product may have been deleted.
    const products = recentlyViewedItems
      .map(item => item.product)
      .filter(product => product);

    res.json({
      success: true,
      products
    });
  } catch (error) {
    next(error);
  }
};