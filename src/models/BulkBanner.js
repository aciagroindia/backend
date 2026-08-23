const mongoose = require('mongoose');

const bulkBannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true }, // URL from Cloudinary
    publicId: { type: String, required: true }, // Needed to delete image from Cloudinary
    link: { type: String, default: '' },       // Optional click target
    order: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['Active', 'Inactive'], 
        default: 'Active' 
    }
}, { timestamps: true });

module.exports = mongoose.model('BulkBanner', bulkBannerSchema);
