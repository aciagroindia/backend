const Banner = require('../models/Banner');
const { cloudinary } = require('../config/cloudinary');
const createError = require('http-errors');

// @desc    Get banners (Home Page: Active only | Admin: All)
exports.getBanners = async (req, res, next) => {
    try {
        const isAdmin = req.query.admin === 'true';
        const filter = isAdmin ? {} : { status: 'Active' };
        const banners = await Banner.find(filter).sort({ order: 1 });
        res.json(banners);
    } catch (error) {
        next(error);
    }
};

// @desc    Create Banner (Admin Only)
exports.createBanner = async (req, res, next) => {
    try {
        if (!req.file) {
            throw createError(400, "Please upload an image");
        }

        const { title, order, status } = req.body;
        const newBanner = await Banner.create({
            title,
            order,
            status,
            imageUrl: req.file.path,
            publicId: req.file.filename // req.file.filename contains the public_id
        });
        res.status(201).json(newBanner);
    } catch (error) {
        next(error);
    }
};

// @desc    Update Banner (Handle text and optional Image)
exports.updateBanner = async (req, res, next) => {
    try {
        const { title, order, status } = req.body;
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            throw createError(404, "Banner not found");
        }

        if (req.file) {
            // Delete the OLD image from Cloudinary
            if (banner.publicId) {
                await cloudinary.uploader.destroy(banner.publicId);
            }
            
            // Update with NEW Cloudinary data
            banner.imageUrl = req.file.path;
            banner.publicId = req.file.filename;
        }

        banner.title = title || banner.title;
        banner.order = order || banner.order;
        banner.status = status || banner.status;

        const updatedBanner = await banner.save();
        res.json(updatedBanner);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete Banner
exports.deleteBanner = async (req, res, next) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            throw createError(404, "Banner not found");
        }

        // Delete from Cloudinary
        if (banner.publicId) {
            await cloudinary.uploader.destroy(banner.publicId);
        }
        
        await banner.deleteOne();
        res.json({ message: "Banner removed successfully" });
    } catch (error) {
        next(error);
    }
};