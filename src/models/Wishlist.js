const mongoose = require('mongoose');
const { Schema } = mongoose;

const wishlistSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Each user has only one wishlist document
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
  }],
}, {
  timestamps: true,
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;