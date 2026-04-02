const Joi = require('joi');

const orderItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).required(),
});

const shippingAddressSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  postalCode: Joi.string().required(),
});

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  shippingAddress: shippingAddressSchema.required(),
  clearCart: Joi.boolean().optional(),
});

const fakePaymentSuccessSchema = Joi.object({
  orderId: Joi.string().hex().length(24).required(),
});

const getOrderByIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

module.exports = {
  createOrderSchema,
  fakePaymentSuccessSchema,
  getOrderByIdSchema,
};