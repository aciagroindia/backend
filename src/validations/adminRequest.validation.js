const Joi = require('joi');

const objectIdParamSchema = Joi.object({
    id: Joi.string().hex().length(24).required(),
});

module.exports = {
  objectIdParamSchema,
};