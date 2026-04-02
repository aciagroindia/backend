const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { MongoInvalidArgumentError } = require('mongodb');

/**
 * Get a user's wishlist, populating product details.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Object>} The user's wishlist with product details.
 */
const getUserWishlist = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: 'products',
    model: 'Product',
    select: 'name price image slug', // You can customize which product fields to return
  });

  if (!wishlist) {
    // If user has no wishlist yet, return an empty one for consistency on the frontend.
    return { products: [] };
  }

  return wishlist;
};

/**
 * Add or remove a product from the user's wishlist.
 * @param {string} userId - The ID of the user.
 * @param {string} productId - The ID of the product.
 * @returns {Promise<{wishlist: Object, added: boolean}>} The updated wishlist and a flag indicating if the product was added.
 */
const toggleWishlist = async (userId, productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new MongoInvalidArgumentError('Product with the given ID not found');
  }

  let wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, products: [] });
  }

  const productIndex = wishlist.products.findIndex(p => p.equals(productId));

  let added = false;
  if (productIndex > -1) {
    wishlist.products.splice(productIndex, 1);
  } else {
    wishlist.products.push(new mongoose.Types.ObjectId(productId));
    added = true;
  }

  await wishlist.save();

  return { wishlist, added };
};

module.exports = {
  getUserWishlist,
  toggleWishlist,
};