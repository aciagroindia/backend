const express = require("express");
const router = express.Router();

const {
  createOrder,
  verifyPayment, 
  getMyOrders,
  getOrderById,
  cancelMyOrder
} = require("../controllers/orderController");

const { shiprocketWebhook } = require('../controllers/adminOrderController');
const { protect } = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validationMiddleware");

const {
  createOrderSchema,
  getOrderByIdSchema,
} = require("../validations/order.validation");

// ==========================================
// 🔔 SHIPROCKET WEBHOOK ROUTE
// Dhyan de: Ispe protect middleware nahi laga hai
// ==========================================
router.post("/webhook/shiprocket", shiprocketWebhook);

// create order
router.post("/", protect, validate(createOrderSchema), createOrder);

router.post("/pay", protect, verifyPayment);

// user orders
router.get("/my-orders", protect, getMyOrders);

// single order
router.get("/:id", protect, validate(getOrderByIdSchema, "params"), getOrderById);

// Cancel pending order route
router.put("/:id/cancel", protect, cancelMyOrder);

module.exports = router;