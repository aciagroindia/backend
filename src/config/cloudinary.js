const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const multerStorageCloudinary = require('multer-storage-cloudinary');
require('dotenv').config();

// Fail-safe: Detect if CloudinaryStorage is a named export or the default export
const CloudinaryStorage = multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary;

// 1. Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim()
});



// 2. Storage Engine Setup
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params:  (req, file) => {
        // Dynamically set folder based on the route
        let folder;
        if (req.originalUrl.includes('/api/categories')) {
            folder = 'categories';
        } else if (req.originalUrl.includes('/api/products')) {
            folder = 'products';
        } else if (req.originalUrl.includes('/api/banners')) {
            folder = 'banners';
        } else {
            folder = 'misc'; // A fallback folder
        }

        return {
            folder: folder,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            // Use a consistent public_id format
            public_id: `${folder.slice(0, 4)}-${Date.now()}`, 
            transformation: [{ width: 600, height: 600, crop: 'limit', quality: 'auto' }]
        };
    },
});

// 3. Initialize Multer
// This direct-to-cloudinary upload middleware is no longer used.
// We now use memory storage first, then a custom uploader middleware.
// const upload = multer({ storage: storage });

module.exports = { cloudinary };
