const cartService = require("../services/cart.service");
const { calculateComboDiscounts } = require("../services/comboPricing.service");

const buildCartResponse = async (cart) => {
  const cartObj = cart.toObject ? cart.toObject() : cart;
  const rawItems = (cartObj.items || []).map(i => ({
    productId: i.product?._id || i.product,
    price: i.price,
    quantity: i.quantity,
    variant: i.variant,
    packageId: i.packageId
  }));
  
  const comboResult = await calculateComboDiscounts(rawItems);
  const originalSubtotal = comboResult.originalSubtotal;
  const comboDiscount = comboResult.comboDiscount;
  const comboSubtotal = comboResult.comboSubtotal;

  return {
    ...cartObj,
    subtotal: originalSubtotal,
    originalSubtotal: originalSubtotal,
    comboDiscount: comboDiscount,
    comboSubtotal: comboSubtotal,
    appliedCombos: comboResult.appliedCombos,
    totalPrice: comboSubtotal,
  };
};

const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    const data = await buildCartResponse(cart);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const cart = await cartService.addToCart(req.user.id, req.body);
    const data = await buildCartResponse(cart);
    res.json({
      success: true,
      message: "Item added to cart",
      data,
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
    const data = await buildCartResponse(cart);
    res.json({
      success: true,
      message: "Cart updated successfully",
      data,
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
    const data = await buildCartResponse(cart);
    res.json({
      success: true,
      message: "Item removed from cart",
      data,
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