const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Database call mein delay ho sakta hai, isliye console lagaya hai debug ke liye
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            return next(); // ✅ Return lagana zaroori hai
        } catch (error) {
            console.error("JWT Verification Error:", error.message);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

const optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            console.error("Optional JWT Verification Error (Guest Access granted):", error.message);
        }
    }
    next();
};

const admin = (req, res, next) => {
    // Admin aur Owner dono ko access dena chahiye
    if (req.user && (req.user.role === 'admin' || req.user.role === 'owner')) {
        next();
    } else {
        return res.status(403).json({ 
            success: false, 
            message: "Not authorized as an admin. Access denied." 
        });
    }
};

// ✅ Dono ko EK SAATH export karein
module.exports = { protect, admin, optionalProtect };