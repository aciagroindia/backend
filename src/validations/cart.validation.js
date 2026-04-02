const Joi = require('joi');

const addToCartSchema = Joi.object({
  productId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Product ID must be a valid MongoDB ObjectId',
    'string.length': 'Product ID must be 24 characters long',
  }),
  quantity: Joi.number().integer().min(1).default(1),
});

const updateQuantitySchema = Joi.object({
  itemId: Joi.string().hex().length(24).required(),
  delta: Joi.number().integer().not(0).required(),
});

const removeItemSchema = Joi.object({
  itemId: Joi.string().hex().length(24).required(),
});

module.exports = {
  addToCartSchema,
  updateQuantitySchema,
  removeItemSchema,
};