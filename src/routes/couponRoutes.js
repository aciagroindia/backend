const express = require("express");
const router = express.Router();

const {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    applyCoupon,
    getAvailableCoupons,
} = require("../controllers/couponController");

const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");
const { validate } = require("../middlewares/validationMiddleware");
const {
    couponSchema,
    updateCouponSchema,
    applyCouponSchema,
} = require("../validations/coupon.validation");

const { objectIdParamSchema } = require("../validations/discount.validation");

const adminOnly = [protect, admin, checkAdminAccess];

// Customer routes
router.get("/available", protect, getAvailableCoupons);
router.post("/apply", protect, validate(applyCouponSchema), applyCoupon);

// Admin routes
router.route("/")
    .get(adminOnly, getCoupons)
    .post(adminOnly, validate(couponSchema), createCoupon);

router.route("/:id")
    .put(adminOnly, validate(objectIdParamSchema, 'params'), validate(updateCouponSchema), updateCoupon)
    .delete(adminOnly, validate(objectIdParamSchema, 'params'), deleteCoupon);

module.exports = router;
