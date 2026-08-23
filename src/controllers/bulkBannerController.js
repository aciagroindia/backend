const BulkBanner = require('../models/BulkBanner');
const { cloudinary } = require('../config/cloudinary');
const createError = require('http-errors');

// @desc    Get bulk banners (Bulk Order Page: Active only | Admin: All)
exports.getBulkBanners = async (req, res, next) => {
    try {
        const isAdmin = req.query.admin === 'true';
        const filter = isAdmin ? {} : { status: 'Active' };
        const banners = await BulkBanner.find(filter).sort({ order: 1 });
        res.json(banners);
    } catch (error) {
        next(error);
    }
};

// @desc    Create Bulk Banner (Admin Only)
exports.createBulkBanner = async (req, res, next) => {
    try {
        if (!req.file) {
            throw createError(400, "Please upload an image");
        }

        const { title, order, status, link } = req.body;
        const newBanner = await BulkBanner.create({
            title,
            order: Number(order) || 0,
            status: status || 'Active',
            link: link || '',
            imageUrl: req.file.path,
            publicId: req.file.filename // req.file.filename contains the public_id from Cloudinary
        });
        res.status(201).json(newBanner);
    } catch (error) {
        next(error);
    }
};

// @desc    Update Bulk Banner (Admin Only)
exports.updateBulkBanner = async (req, res, next) => {
    try {
        const { title, order, status, link } = req.body;
        const banner = await BulkBanner.findById(req.params.id);

        if (!banner) {
            throw createError(404, "Bulk banner not found");
        }

        if (req.file) {
            // Delete the OLD image from Cloudinary
            if (banner.publicId) {
                try {
                    await cloudinary.uploader.destroy(banner.publicId);
                } catch (cErr) {
                    console.warn("Cloudinary delete old image warning:", cErr.message);
                }
            }
            
            // Update with NEW Cloudinary data
            banner.imageUrl = req.file.path;
            banner.publicId = req.file.filename;
        }

        if (title !== undefined) banner.title = title;
        if (order !== undefined) banner.order = Number(order);
        if (status !== undefined) banner.status = status;
        if (link !== undefined) banner.link = link;

        const updatedBanner = await banner.save();
        res.json(updatedBanner);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete Bulk Banner (Admin Only)
exports.deleteBulkBanner = async (req, res, next) => {
    try {
        const banner = await BulkBanner.findById(req.params.id);
        if (!banner) {
            throw createError(404, "Bulk banner not found");
        }

        // Delete from Cloudinary
        if (banner.publicId) {
            try {
                await cloudinary.uploader.destroy(banner.publicId);
            } catch (cErr) {
                console.warn("Cloudinary delete image warning:", cErr.message);
            }
        }
        
        await banner.deleteOne();
        res.json({ message: "Bulk banner removed successfully" });
    } catch (error) {
        next(error);
    }
};
