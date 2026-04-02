const Certificate = require("../models/Certificate");
const createError = require("http-errors");

// @desc    Get all certificates
// @route   GET /api/certificates
// @access  Public
exports.getCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a certificate
// @route   POST /api/certificates
// @access  Admin
exports.createCertificate = async (req, res, next) => {
  try {
    const { title } = req.body;
    const image = req.file ? req.file.path : req.body.image;

    if (!title || !image) {
      throw createError(400, "Title and image are required.");
    }

    const certificate = await Certificate.create({ title, image });

    res.status(201).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a certificate
// @route   DELETE /api/certificates/:id
// @access  Admin
exports.deleteCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findByIdAndDelete(req.params.id);

    if (!certificate) {
      throw createError(404, "Certificate not found.");
    }

    res.json({
      success: true,
      message: "Certificate deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
