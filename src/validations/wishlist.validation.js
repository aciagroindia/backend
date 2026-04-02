const Joi = require("joi");

const toggleWishlistSchema = Joi.object({
  productId: Joi.string().required(),
});

module.exports = {
  toggleWishlistSchema,
};