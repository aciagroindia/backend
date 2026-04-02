const express = require("express");
const router = express.Router();

const {
    getDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
} = require("../controllers/discountController");

const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");
const { validate } = require("../middlewares/validationMiddleware");
const {
    objectIdParamSchema,
    discountSchema,
    updateDiscountSchema,
} = require("../validations/discount.validation.js");

const adminOnly = [protect, admin, checkAdminAccess];

router.route("/")
    .get(adminOnly, getDiscounts)
    .post(adminOnly, validate(discountSchema), createDiscount);

router.route("/:id")
    .put(adminOnly, validate(objectIdParamSchema, 'params'), validate(updateDiscountSchema), updateDiscount)
    .delete(adminOnly, validate(objectIdParamSchema, 'params'), deleteDiscount);

module.exports = router;