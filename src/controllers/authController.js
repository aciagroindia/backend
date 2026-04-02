const User = require('../models/User');
const Notification = require('../models/Notification');
const generateToken = require('../utils/generateToken');
const createError = require('http-errors');

// 1. REGISTER USER
exports.registerUser = async (req, res, next) => {
    try {
        const { name, email, phone, password } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { phone }] });
        if (userExists) {
            const field = userExists.email === email ? 'email' : 'phone';
            throw createError(400, `User with this ${field} already exists.`);
        }

        const user = await User.create({ name, email, phone, password });

        // CREATE NOTIFICATION
        await Notification.create({
            type: "user",
            text: `New customer registered: ${user.name}`,
            link: "/admin/customers"
        });
        // Consistent Response Structure
        res.status(201).json({
            success: true,
            message: "Account created successfully.",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isAdminApproved: user.isAdminApproved
                },
                token: generateToken(user._id)
            }
        });
    } catch (error) { next(error); }
};

// 2. LOGIN USER (Email or Phone)
exports.loginUser = async (req, res, next) => {
    try {
        const { email, phone, password } = req.body; // email and phone are now optional

        // Joi validation in the route now handles this, but this is a good safeguard.
        if (!email && !phone) {
            throw createError(400, "Please provide email or phone number.");
        }

        // Dynamically create the query based on provided input
        const query = email ? { email: email.toLowerCase() } : { phone };
        const user = await User.findOne(query);

        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                message: "Logged in successfully",
                data: {
                    user: { 
                        _id: user._id, 
                        name: user.name, 
                        email: user.email, 
                        phone: user.phone,
                        role: user.role, 
                        isAdminApproved: user.isAdminApproved 
                    },
                    token: generateToken(user._id)
                }
            });
        } else {
            // Generic error message for security
            throw createError(401, "Invalid credentials.");
        }
    } catch (error) { next(error); }
};

// 3. GET ME (Latest Status Fetch)
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) throw createError(404, "User not found");

        res.json({ 
            success: true, 
            data: { user } // Consistent nesting
        });
    } catch (error) { next(error); }
};

// 4. GET USER PROFILE
exports.getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) throw createError(404, 'User not found');

        res.json({ 
            success: true, 
            data: { user } 
        });
    } catch (error) { next(error); }
};