const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cart.controller");
const { protect } = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validationMiddleware");
const {
  addToCartSchema,
  updateQuantitySchema,
  removeItemSchema,
} = require("../validations/cart.validation");

router.get("/", protect, cartController.getCart);

router.post(
  "/add",
  protect,
  validate(addToCartSchema),
  cartController.addToCart
);

router.post(
  "/update",
  protect,
  validate(updateQuantitySchema),
  cartController.updateQuantity
);

router.delete(
  "/remove/:itemId",
  protect,
  validate(removeItemSchema, "params"),
  cartController.removeItem
);

module.exports = router;