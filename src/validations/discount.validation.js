const Joi = require('joi');

const objectIdParamSchema = Joi.object({
    id: Joi.string().hex().length(24).required(),
});

const discountSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('Percentage', 'Fixed Amount', 'Shipping', 'BOGO').required(),
    value: Joi.number().required(),
    conditionType: Joi.string().valid('ALL_ORDERS', 'FIRST_ORDER', 'MIN_ORDER_VALUE', 'SPECIFIC_PRODUCTS').optional(),
    minOrderAmount: Joi.number().min(0).allow(null, '').optional(),
    maxDiscountAmount: Joi.number().min(0).allow(null, '').optional(),
    isActive: Joi.boolean().optional(),
    products: Joi.array().items(Joi.string().hex().length(24)).optional(),
});

const updateDiscountSchema = Joi.object({
    name: Joi.string(),
    type: Joi.string().valid('Percentage', 'Fixed Amount', 'Shipping', 'BOGO'),
    value: Joi.number(),
    conditionType: Joi.string().valid('ALL_ORDERS', 'FIRST_ORDER', 'MIN_ORDER_VALUE', 'SPECIFIC_PRODUCTS').optional(),
    minOrderAmount: Joi.number().min(0).allow(null, '').optional(),
    maxDiscountAmount: Joi.number().min(0).allow(null, '').optional(),
    isActive: Joi.boolean().optional(),
    products: Joi.array().items(Joi.string().hex().length(24)).optional(),
}).min(1);

module.exports = {
    objectIdParamSchema,
    discountSchema,
    updateDiscountSchema,
};