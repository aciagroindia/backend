const Joi = require('joi');

const couponSchema = Joi.object({
    code: Joi.string().required().uppercase(),
    discount: Joi.string().required(),
    usageLimit: Joi.string().allow('', null),
    expiryDate: Joi.date().allow('', null),
    isActive: Joi.boolean()
});

const updateCouponSchema = Joi.object({
    code: Joi.string().uppercase(),
    discount: Joi.string(),
    usageLimit: Joi.string().allow('', null),
    expiryDate: Joi.date().allow('', null),
    isActive: Joi.boolean()
}).min(1);

module.exports = {
    couponSchema,
    updateCouponSchema
};
