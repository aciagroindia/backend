const Joi = require('joi');

const addRecentlyViewedSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
});

module.exports = {
  addRecentlyViewedSchema,
};