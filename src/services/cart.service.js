const Cart = require("../models/cart.model");
const Product = require("../models/Product");
const createError = require("http-errors");

const getCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate(
    "items.product",
    "name price image slug stock"
  );

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [],
    });
  } else {
    // Optional: You can add logic here to remove items from cart if product was deleted.
    const validItems = cart.items.filter(item => item.product);
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }
  }

  return cart;
};

const addToCart = async (userId, productData) => {
  const { productId, quantity } = productData;

  const product = await Product.findById(productId);
  if (!product) {
    throw createError(404, "Product not found");
  }

  let cart = await getCart(userId);

  const existingItem = cart.items.find(
    (item) => item.product._id.toString() === productId
  );

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (product.stock < newQuantity) {
      throw createError(
        400,
        `Not enough stock for ${product.name}. Only ${product.stock} available.`
      );
    }
    existingItem.quantity = newQuantity;
  } else {
    if (product.stock < quantity) {
      throw createError(
        400,
        `Not enough stock for ${product.name}. Only ${product.stock} available.`
      );
    }
    cart.items.push({
      product: productId,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.image,
      slug: product.slug,
    });
  }

  await cart.save();
  await cart.populate("items.product", "name price image slug stock");

  return cart;
};

const updateQuantity = async (userId, itemId, delta) => {
  const cart = await getCart(userId);
  const item = cart.items.id(itemId);

  if (!item) {
    throw createError(404, "Item not found in cart");
  }

  const newQuantity = item.quantity + delta;

  if (newQuantity <= 0) {
    cart.items.pull(itemId);
  } else {
    if (delta > 0) {
      const product = await Product.findById(item.product);
      if (!product) {
        cart.items.pull(itemId);
        await cart.save();
        throw createError(404, "Associated product not found, item removed.");
      }
      if (product.stock < newQuantity) {
        throw createError(
          400,
          `Not enough stock for ${product.name}. Only ${product.stock} available.`
        );
      }
    }
    item.quantity = newQuantity;
  }

  await cart.save();
  return cart;
};

const removeItem = async (userId, itemId) => {
  const cart = await getCart(userId);
  // Use the Mongoose 'pull' method to atomically remove the subdocument
  // from the 'items' array. This is more robust than finding and then removing.
  cart.items.pull(itemId);

  await cart.save();
  return cart;
};

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
};