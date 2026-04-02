const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true }, // URL from Cloudinary
    publicId: { type: String, required: true }, // Needed to delete image from Cloudinary
    order: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['Active', 'Inactive'], 
        default: 'Active' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);