const cartService = require("../services/cart.service");

const calculateCartTotal = (cart) => {
  return cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
};

const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.json({
      success: true,
      data: {
        ...cart.toObject(),
        totalPrice: calculateCartTotal(cart)
      },
    });
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const cart = await cartService.addToCart(req.user.id, req.body);
    res.json({
      success: true,
      message: "Item added to cart",
      data: {
        ...cart.toObject(),
        totalPrice: calculateCartTotal(cart)
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateQuantity = async (req, res, next) => {
  try {
    const { itemId, delta } = req.body;
    const cart = await cartService.updateQuantity(
      req.user.id,
      itemId,
      delta
    );
    res.json({
      success: true,
      message: "Cart updated successfully",
      data: {
        ...cart.toObject(),
        totalPrice: calculateCartTotal(cart)
      },
    });
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const cart = await cartService.removeItem(
      req.user.id,
      req.params.itemId
    );
    res.json({
      success: true,
      message: "Item removed from cart",
      data: {
        ...cart.toObject(),
        totalPrice: calculateCartTotal(cart)
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
};