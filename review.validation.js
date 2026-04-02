const Joi = require('joi');

const createReviewSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().required(),
});

const getProductReviewsSchema = Joi.object({
    productId: Joi.string().hex().length(24).required(),
});

module.exports = {
  createReviewSchema,
  getProductReviewsSchema,
};