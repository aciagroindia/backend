const Joi = require('joi');

// Schema for validating MongoDB ObjectIds in params
const objectIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid ID format',
    'string.length': 'Invalid ID format',
    'any.required': 'ID is required',
  }),
});

// Schema for creating a category
// Note: 'name' is validated from 'body', but 'image' is handled by multer.
const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(3).required().messages({
    'string.base': 'Name must be a string',
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 3 characters long',
    'any.required': 'Name is required',
  }),
  description: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('Active', 'Inactive').optional(),
});

// Schema for updating a category
const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(3).optional(),
  description: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('Active', 'Inactive').optional(),
});

module.exports = {
  objectIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
};