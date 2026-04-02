const Joi = require('joi');

const objectIdParamSchema = Joi.object({
    id: Joi.string().hex().length(24).required(),
});

const updateStatusSchema = Joi.object({
    status: Joi.string().required(),
});

module.exports = {
  objectIdParamSchema,
  updateStatusSchema,
};