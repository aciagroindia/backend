const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

// Routes are prefixed with /api/auth in server.js
router.post('/signup', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get('/profile', protect, getUserProfile); // Existing route
router.get('/me', protect, getMe); // New route from previous request

module.exports = router;