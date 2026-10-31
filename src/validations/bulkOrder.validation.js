const Joi = require("joi");

const createBulkOrderSchema = Joi.object({
  firstName: Joi.string().trim().required(),
  companyName: Joi.string().trim().required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().required(),
  productRequired: Joi.string().required(),
  quantity: Joi.string().required(),
  packagingSize: Joi.string().required(),
  packagingType: Joi.string().required(),
  manufacturingRequirement: Joi.string().required(),
  message: Joi.string().allow("").optional(),
});

const updateBulkOrderStatusSchema = Joi.object({
  status: Joi.string().valid("new", "contacted", "closed").required(),
});

const objectIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

module.exports = {
  createBulkOrderSchema,
  updateBulkOrderStatusSchema,
  objectIdParamSchema,
};
