const Review = require("../models/Review");
const Product = require("../models/Product");
const createError = require("http-errors");
const mongoose = require("mongoose");

// CREATE REVIEW
exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
        throw createError(404, "Product not found");
    }

    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });

    if (existingReview) {
      throw createError(400, "You already reviewed this product");
    }

    await Review.create({
      product: productId,
      user: req.user.id,
      name: req.user.name,
      rating,
      comment
    });

    // More efficient rating calculation using aggregation
    const stats = await Review.aggregate([
      {
        $match: { product: new mongoose.Types.ObjectId(productId) },
      },
      {
        $group: {
          _id: "$product",
          numReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: stats[0].avgRating,
        numReviews: stats[0].numReviews,
      });
    } else {
      // Fallback to reset stats if all reviews are somehow deleted.
      await Product.findByIdAndUpdate(productId, { rating: 0, numReviews: 0 });
    }

    res.status(201).json({
      success: true,
      message: "Review submitted"
    });
  } catch (error) {
    next(error);
  }
};


// GET PRODUCT REVIEWS
exports.getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Testimonial Reviews for Homepage
// @route   GET /api/reviews/testimonials
exports.getHomepageTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Review.aggregate([
      { $match: { rating: { $gte: 4 } } },
      { $sample: { size: 10 } },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $project: {
          reviewId: '$_id',
          name: '$name',
          rating: '$rating',
          comment: '$comment',
          productName: '$productInfo.name',
          productImage: { $first: '$productInfo.images' },
          _id: 0,
        },
      },
    ]);

    res.json({
      success: true,
      testimonials,
    });
  } catch (error) {
    next(error);
  }
};