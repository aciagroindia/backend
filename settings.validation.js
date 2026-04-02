const Joi = require('joi');

const updateProfileSchema = Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
}).unknown(true);

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
});

const updatePreferencesSchema = Joi.object({
    emailNotifications: Joi.boolean(),
    language: Joi.string().length(2),
}).min(1);

module.exports = {
    updateProfileSchema,
    changePasswordSchema,
    updatePreferencesSchema,
};