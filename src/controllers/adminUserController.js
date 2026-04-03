const User = require("../models/User");
const createError = require("http-errors");

// A simple wrapper to catch errors in async routes
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get all users/customers for admin
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
    // Fetch all users. You might want to add pagination in the future.
    // The '-password' option excludes the password field from the result for security.
    const users = await User.find({}).select('-password'); 

    res.json({
        success: true,
        data: users
    });
});

// @desc    Get a single user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        throw createError(404, "User not found");
    }
    res.json({ success: true, data: user });
});