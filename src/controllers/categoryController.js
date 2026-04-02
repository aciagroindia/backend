const Category = require('../models/Category');
const { cloudinary } = require('../config/cloudinary');
const createError = require('http-errors');
// @desc Get all categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get Category by Slug
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, status: 'Active' });
    if (!category) {
      throw createError(404, 'Category not found');
    }
    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};


// @desc Create Category
exports.createCategory = async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError(400, 'Category image is required.');
    }

    const { name, description, status } = req.body;
    
    // Check if category already exists (Prevent duplicates)
    const exists = await Category.findOne({ name });
    if (exists) {
      throw createError(400, 'A category with this name already exists.');
    }

    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const category = await Category.create({
      name,
      slug,
      description,
      status: status || 'Active',
      image: req.file.path,       // Cloudinary URL
      publicId: req.file.filename // Cloudinary Public ID
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};



// @desc Update Category
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw createError(404, 'Category not found');
    }

    const oldPublicId = category.publicId;

    // If a new image is uploaded, set the new paths
    if (req.file) {
      category.image = req.file.path;
      category.publicId = req.file.filename;
    }

    // Update text fields if they are provided in the request body
    if (req.body.name) {
      category.name = req.body.name;
      // Also update the slug when the name changes to maintain consistency
      category.slug = req.body.name
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
    }

    if (req.body.description !== undefined) {
      category.description = req.body.description;
    }

    if (req.body.status !== undefined) {
      category.status = req.body.status;
    }

    const updatedCategory = await category.save();

    // After successfully saving, if a new file was uploaded, delete the old one.
    if (req.file && oldPublicId) {
      // No need to await this. Let it run in the background.
      cloudinary.uploader.destroy(oldPublicId).catch(err => {
        console.error(`Orphaned image cleanup failed for publicId: ${oldPublicId}`, err);
      });
    }

    res.json({
      success: true,
      data: updatedCategory,
    });

  } catch (error) {
    next(error);
  }
};


// @desc Delete Category
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw createError(404, 'Category not found');
    }

    const publicId = category.publicId;

    await category.deleteOne();

    // After successfully deleting from DB, delete from Cloudinary in the background.
    if (publicId) {
      cloudinary.uploader.destroy(publicId).catch(err => {
        console.error(`Orphaned image cleanup failed for publicId: ${publicId}`, err);
      });
    }

    res.json({
      success: true,
      message: 'Category deleted',
    });

  } catch (error) {
    next(error);
  }
};