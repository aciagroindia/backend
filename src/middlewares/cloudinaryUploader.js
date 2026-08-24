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
    } else if (req.originalUrl.includes('/api/articles')) {
        folder = 'articles';
    } else if (req.originalUrl.includes('/api/why-choose-us')) {
        folder = 'why-choose-us';
    } else if (req.originalUrl.includes('/api/about-page') || req.originalUrl.includes('/api/admin/about-page')) {
        folder = 'about-page';
    } else {
        folder = 'misc'; // A fallback folder
    }

    const uploadSingleBuffer = (fileObj) => {
        return new Promise((resolve, reject) => {
            const public_id = `${folder.slice(0, 4)}-${Date.now()}-${Math.round(Math.random() * 1E6)}`;
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    public_id: public_id,
                    resource_type: 'auto',
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary Upload Error:', error);
                        return reject(createError(500, 'Image could not be uploaded.'));
                    }
                    fileObj.path = result.secure_url;
                    fileObj.filename = result.public_id;
                    resolve(result);
                }
            );
            streamifier.createReadStream(fileObj.buffer).pipe(uploadStream);
        });
    };

    if (req.file) {
        uploadSingleBuffer(req.file)
            .then(() => next())
            .catch(next);
    } else if (req.files) {
        const filesToUpload = Array.isArray(req.files) 
            ? req.files 
            : Object.values(req.files).flat();

        if (filesToUpload.length === 0) {
            return next();
        }

        Promise.all(filesToUpload.map(uploadSingleBuffer))
            .then(() => next())
            .catch(next);
    } else {
        next();
    }
};

module.exports = { uploadToCloudinary };