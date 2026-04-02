const express = require("express");
const router = express.Router();

const {
  createBulkOrder,
  getBulkOrders,
  updateBulkOrderStatus,
} = require("../controllers/bulkOrderController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");
const { validate } = require("../middlewares/validationMiddleware");
const {
  createBulkOrderSchema,
  updateBulkOrderStatusSchema,
  objectIdParamSchema,
} = require("../validations/bulkOrder.validation");

const adminOnly = [protect, admin, checkAdminAccess];

// user submit form
router.post("/", validate(createBulkOrderSchema), createBulkOrder);

// admin get enquiries
router.get("/", adminOnly, getBulkOrders);

// admin update status
router.put(
  "/:id",
  adminOnly,
  validate(objectIdParamSchema, "params"),
  validate(updateBulkOrderStatusSchema),
  updateBulkOrderStatus
);

module.exports = router;