const Joi = require('joi');

const couponSchema = Joi.object({
    code: Joi.string().required().uppercase(),
    discountType: Joi.string().valid('Percentage', 'FixedAmount').optional(),
    discountValue: Joi.number().optional(),
    discount: Joi.string().optional(), // For backward compatibility with form input
    minOrderAmount: Joi.number().min(0).allow(null, '').optional(),
    maxDiscountAmount: Joi.number().min(0).allow(null, '').optional(),
    usageLimit: Joi.number().min(1).allow(null, '').optional(),
    userUsageLimit: Joi.number().min(1).allow(null, '').optional(),
    expiryDate: Joi.date().allow('', null).optional(),
    isActive: Joi.boolean().optional()
});

const updateCouponSchema = Joi.object({
    code: Joi.string().uppercase().optional(),
    discountType: Joi.string().valid('Percentage', 'FixedAmount').optional(),
    discountValue: Joi.number().optional(),
    discount: Joi.string().optional(),
    minOrderAmount: Joi.number().min(0).allow(null, '').optional(),
    maxDiscountAmount: Joi.number().min(0).allow(null, '').optional(),
    usageLimit: Joi.number().min(1).allow(null, '').optional(),
    userUsageLimit: Joi.number().min(1).allow(null, '').optional(),
    expiryDate: Joi.date().allow('', null).optional(),
    isActive: Joi.boolean().optional()
}).min(1);

const applyCouponSchema = Joi.object({
    code: Joi.string().required().uppercase(),
    items: Joi.array().items(Joi.object()).required()
});

module.exports = {
    couponSchema,
    updateCouponSchema,
    applyCouponSchema,
};
