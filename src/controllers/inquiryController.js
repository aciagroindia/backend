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

// @desc    Delete a single inquiry
// @route   DELETE /api/admin/inquiries/:id
// @access  Admin
exports.deleteInquiry = async (req, res, next) => {
  try {
    const inquiry = await BulkInquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) {
      throw createError(404, "Inquiry not found");
    }

    res.json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cleanup all closed inquiries
// @route   DELETE /api/admin/inquiries/cleanup/closed
// @access  Admin
exports.cleanupClosedInquiries = async (req, res, next) => {
  try {
    const result = await BulkInquiry.deleteMany({ status: "Closed" });
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} closed inquiries`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete inquiries by IDs
// @route   POST /api/admin/inquiries/bulk-delete
// @access  Admin
exports.bulkDeleteInquiries = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw createError(400, "Please provide an array of inquiry IDs");
    }

    const result = await BulkInquiry.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} inquiries successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
