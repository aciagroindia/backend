const User = require("../models/User.js");
const AdminRequest = require("../models/AdminRequest.js");
const createError = require("http-errors");
const { sendApprovalEmail } = require("../utils/emailService");

exports.requestAdminAccess = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // Check if a user with this email already exists
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      // If user exists, check if they are already an admin or have a pending request
      if (user.role === 'admin' && user.isAdminApproved) {
        throw createError(400, "User with this email is already an approved admin.");
      }
      const existingRequest = await AdminRequest.findOne({ user: user._id, status: "pending" });
      if (existingRequest) {
        throw createError(400, "A pending admin request already exists for this email.");
      }
      // If user exists but is not an admin and has no pending request,
      // we prevent new admin registration with existing email to keep systems separate.
      throw createError(400, "A user with this email already exists. Please use a different email to register as an admin.");
    } else {
      // Create a new user with admin role (pending approval)
      user = await User.create({
        name,
        email: normalizedEmail,
        password, // Password will be hashed by pre-save hook in User model
        role: "admin", // Set role to admin, but isAdminApproved will be false by default
        isAdminApproved: false,
      });
    }

    // Request check karna
    const existingRequest = await AdminRequest.findOne({
      user: user._id,
      status: "pending",
    });

    if (existingRequest) {
      throw createError(400, "You already have a pending admin request.");
    }

    // Request create karein
    const newRequest = await AdminRequest.create({
      user: user._id,
      status: "pending",
    });

    // Owner ko mail bhejein
    await sendApprovalEmail(user.name, user.email, newRequest._id);

    res.json({
      success: true,
      message: "Admin access request has been sent to the owner for approval.",
    });
  } catch (error) {
    next(error);
  }
};