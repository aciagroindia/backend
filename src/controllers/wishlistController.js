const wishlistService = require("../services/wishlist.service");

const toggleWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    const result = await wishlistService.toggleWishlist(userId, productId);

    res.status(200).json({
      success: true,
      message: result.added ? "Product added to wishlist" : "Product removed from wishlist",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const wishlist = await wishlistService.getUserWishlist(userId);

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleWishlist,
  getWishlist,
};