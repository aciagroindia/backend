const Joi = require('joi');

const objectIdParamSchema = Joi.object({
    id: Joi.string().hex().length(24).required(),
});

const discountSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('Percentage', 'Fixed Amount', 'Shipping', 'BOGO').required(),
    value: Joi.number().required(),
    products: Joi.array().items(Joi.string().hex().length(24)),
});

const updateDiscountSchema = Joi.object({
    name: Joi.string(),
    type: Joi.string().valid('Percentage', 'Fixed Amount', 'Shipping', 'BOGO'),
    value: Joi.number(),
    products: Joi.array().items(Joi.string().hex().length(24)),
}).min(1);

module.exports = {
    objectIdParamSchema,
    discountSchema,
    updateDiscountSchema,
};