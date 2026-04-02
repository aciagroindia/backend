const BulkInquiry = require("../models/BulkInquiry");
const Notification = require("../models/Notification");
const createError = require("http-errors");

// @desc    Submit a new bulk inquiry
// @route   POST /api/inquiries
// @access  Public
exports.createInquiry = async (req, res, next) => {
  try {
    const { name, email, mobile, message } = req.body;

    if (!name || !email || !mobile || !message) {
      throw createError(400, "All fields are required.");
    }

    const inquiry = await BulkInquiry.create({
      name,
      email,
      mobile,
      message,
    });

    // CREATE NOTIFICATION
    await Notification.create({
        type: "alert", // or "inquiry" if I add it, but mapping to "alert" for icon
        text: `New bulk inquiry from ${inquiry.name}`,
        link: "/admin/inquiries"
    });

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bulk inquiries
// @route   GET /api/admin/inquiries
// @access  Admin
exports.getInquiries = async (req, res, next) => {
  try {
    const inquiries = await BulkInquiry.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: inquiries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inquiry status
// @route   PATCH /api/admin/inquiries/:id
// @access  Admin
exports.updateInquiryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status || !["New", "Contacted", "Closed"].includes(status)) {
        throw createError(400, "Invalid status");
    }

    const inquiry = await BulkInquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      throw createError(404, "Inquiry not found");
    }

    res.json({
      success: true,
      message: "Status updated successfully",
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};
