const Joi = require('joi');

const orderItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).required(),
}).unknown(true); // Safety: frontend se name, image aaye to block na kare

const shippingAddressSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  postalCode: Joi.string().required(),
  state: Joi.string().optional(),
  country: Joi.string().optional(),
  pinCode: Joi.string().optional(),
}).unknown(true); // Safety for live code

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  shippingAddress: shippingAddressSchema.required(),
  clearCart: Joi.boolean().optional(),
  paymentMethod: Joi.string().valid('PayU', 'Razorpay', 'COD').optional(),
}).unknown(true);

// FAKE HATA KAR REAL VERIFY SCHEMA BANAYA
const verifyPaymentSchema = Joi.object({
  orderId: Joi.string().hex().length(24).required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_order_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
  clearCart: Joi.boolean().optional(),
});

const getOrderByIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

module.exports = {
  createOrderSchema,
  verifyPaymentSchema, 
  getOrderByIdSchema,
};