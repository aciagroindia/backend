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

// Login is universal: accepts either email or phone, but one is required.
const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().optional(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    password: Joi.string().required().messages({ 'any.required': 'Password is required.' })
}).xor('email', 'phone');

// Forgot Password Phone Verification
const verifyPhoneSchema = Joi.object({
    phone: Joi.string().required().pattern(/^[0-9]{10,15}$/).messages({
        'string.pattern.base': 'Please enter a valid 10-digit mobile number.',
        'any.required': 'Mobile Number is required.'
    })
});

// Reset Password Schema
const resetPasswordSchema = Joi.object({
    phone: Joi.string().required().pattern(/^[0-9]{10,15}$/).messages({
        'string.pattern.base': 'Valid mobile number required.',
        'any.required': 'Mobile Number is required.'
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'New Password is required.'
    }),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
        'any.only': 'New password and confirm password do not match.',
        'any.required': 'Please confirm your password.'
    })
});

module.exports = { registerSchema, loginSchema, verifyPhoneSchema, resetPasswordSchema };