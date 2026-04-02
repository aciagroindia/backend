const Joi = require('joi');

// Signup ke liye: Name, Email, Phone, Password sab chahiye
const registerSchema = Joi.object({
    name: Joi.string().required().messages({ 'any.required': 'Full Name is required.' }),
    email: Joi.string().email().required().messages({ 'any.required': 'Email is required.' }),
    phone: Joi.string().required().pattern(/^[0-9]{10,15}$/).messages({
        'string.pattern.base': 'Valid mobile number required.',
        'any.required': 'Mobile Number is required.'
    }),
    password: Joi.string().min(6).required()
});

// Login is now universal: accepts either email or phone, but one is required.
const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().optional(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    password: Joi.string().required().messages({ 'any.required': 'Password is required.' })
}).xor('email', 'phone'); // .xor() ensures that either 'email' or 'phone' must be present.

module.exports = { registerSchema, loginSchema };