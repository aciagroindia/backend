const express = require("express");
const router = express.Router();

const {
  createOrder,
  fakePaymentSuccess,
  getMyOrders,
  getOrderById,
} = require("../controllers/orderController");

const { protect } = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validationMiddleware");
const {
  createOrderSchema,
  fakePaymentSuccessSchema,
  getOrderByIdSchema,
} = require("../validations/order.validation");

// create order
router.post("/", protect, validate(createOrderSchema), createOrder);

// fake payment success
router.post("/pay", protect, validate(fakePaymentSuccessSchema), fakePaymentSuccess);

// user orders
router.get("/my-orders", protect, getMyOrders);

// single order
router.get("/:id", protect, validate(getOrderByIdSchema, "params"), getOrderById);

module.exports = router;