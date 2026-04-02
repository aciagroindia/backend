const Joi = require('joi');

const createProduct = Joi.object({
    name: Joi.string().required(),
    price: Joi.number().positive().required(),
    description: Joi.string().required(),
    category: Joi.string().hex().length(24).required().messages({
        'string.hex': 'Category ID must be a valid MongoDB ObjectId',
    }),
    stock: Joi.number().integer().min(0).default(0),
    
    // ✅ STATUS ADD KIYA (Backend Model se match karta hua)
    status: Joi.string().valid('Active', 'Inactive').default('Active'),

    // ✅ FAQS & Packages ADD KIYA (Stringified JSON from FormData)
    faqs: Joi.string().optional().allow(''),
    packages: Joi.string().optional().allow(''),
    unit: Joi.string().optional().allow(''),
});

const updateProductBody = Joi.object({
    name: Joi.string(),
    price: Joi.number().positive(),
    description: Joi.string(),
    category: Joi.string().hex().length(24).messages({
        'string.hex': 'Category ID must be a valid MongoDB ObjectId',
    }),
    stock: Joi.number().integer().min(0),
    
    // ✅ UPDATE MEIN BHI ADD KAREIN
    status: Joi.string().valid('Active', 'Inactive'),
    faqs: Joi.string().optional().allow(''),
    packages: Joi.string().optional().allow(''),
    unit: Joi.string().optional().allow(''),
    imagesToDelete: Joi.string().optional().allow(''),
}).min(1);

const objectIdParam = Joi.object({
    id: Joi.string().hex().length(24).required(),
});

module.exports = {
  createProduct,
  updateProductBody,
  objectIdParam,
};