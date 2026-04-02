const express = require("express");
const router = express.Router();

const {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
} = require("../controllers/couponController");

const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");
const { validate } = require("../middlewares/validationMiddleware");
const {
    couponSchema,
    updateCouponSchema,
} = require("../validations/coupon.validation");

const { objectIdParamSchema } = require("../validations/discount.validation");

const adminOnly = [protect, admin, checkAdminAccess];

router.route("/")
    .get(adminOnly, getCoupons)
    .post(adminOnly, validate(couponSchema), createCoupon);

router.route("/:id")
    .put(adminOnly, validate(objectIdParamSchema, 'params'), validate(updateCouponSchema), updateCoupon)
    .delete(adminOnly, validate(objectIdParamSchema, 'params'), deleteCoupon);

module.exports = router;
