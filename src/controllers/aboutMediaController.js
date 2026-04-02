const AboutMedia = require("../models/AboutMedia");
const createError = require("http-errors");

// @desc    Get all about media
// @route   GET /api/about-media
// @access  Public
exports.getAboutMedia = async (req, res, next) => {
  try {
    const media = await AboutMedia.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create about media
// @route   POST /api/about-media
// @access  Admin
exports.createAboutMedia = async (req, res, next) => {
  try {
    const { title } = req.body;
    const url = req.file ? req.file.path : req.body.url;
    let type = req.body.type;

    if (!url) {
      throw createError(400, "URL/File is required.");
    }

    // Auto-detect type if not provided
    if (!type && req.file) {
      type = req.file.mimetype.startsWith("video") ? "video" : "image";
    }

    if (!type) {
      throw createError(400, "Media type is required.");
    }

    const media = await AboutMedia.create({ type, url, title });

    res.status(201).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete about media
// @route   DELETE /api/about-media/:id
// @access  Admin
exports.deleteAboutMedia = async (req, res, next) => {
  try {
    const media = await AboutMedia.findByIdAndDelete(req.params.id);

    if (!media) {
      throw createError(404, "Media not found.");
    }

    res.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
