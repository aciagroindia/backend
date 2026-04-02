const Joi = require('joi');

const createBulkOrderSchema = Joi.object({
  firstName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  message: Joi.string().required(),
});

const updateBulkOrderStatusSchema = Joi.object({
  status: Joi.string().valid('new', 'contacted', 'closed').required(),
});

const objectIdParamSchema = Joi.object({
    id: Joi.string().hex().length(24).required(),
});

module.exports = {
  createBulkOrderSchema,
  updateBulkOrderStatusSchema,
  objectIdParamSchema
};