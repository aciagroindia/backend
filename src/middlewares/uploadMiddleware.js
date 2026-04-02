const multer = require("multer");

const storage = multer.memoryStorage(); // ✅ REQUIRED for Cloudinary buffer

const upload = multer({ storage });

module.exports = upload;
