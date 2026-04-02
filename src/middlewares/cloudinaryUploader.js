const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');
const createError = require('http-errors');

/**
 * This middleware uploads a file from req.file.buffer to Cloudinary.
 * It should be placed AFTER multer has processed the file into memory
 * and AFTER any validation has been run.
 */
const uploadToCloudinary = (req, res, next) => {
    // If there's no file to upload (e.g., on an update without a new image),
    // just skip to the next middleware.
    if (!req.file) {
        return next();
    }

    // Dynamically set folder based on the route
    let folder;
    if (req.originalUrl.includes('/api/categories')) {
        folder = 'categories';
    } else if (req.originalUrl.includes('/api/products')) {
        folder = 'products';
    } else if (req.originalUrl.includes('/api/banners')) {
        folder = 'banners';
    } else if (req.originalUrl.includes('/api/certificates')) {
        folder = 'certificates';
    } else if (req.originalUrl.includes('/api/about-media')) {
        folder = 'about-media';
    } else {
        folder = 'misc'; // A fallback folder
    }

    const public_id = `${folder.slice(0, 4)}-${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
        {
            folder: folder,
            public_id: public_id,
            resource_type: 'auto', // Support video and image
            // Apply transformations only for images if necessary, or omit for auto
        },
        (error, result) => {
            if (error) {
                console.error('Cloudinary Upload Error:', error);
                // Pass a generic error to the client to avoid leaking implementation details
                return next(createError(500, 'Image could not be uploaded.'));
            }
            // Attach Cloudinary URL and public ID to the file object
            req.file.path = result.secure_url;
            req.file.filename = result.public_id;
            next();
        }
    );

    // Use streamifier to create a readable stream from the buffer and pipe it to Cloudinary
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
};

module.exports = { uploadToCloudinary };