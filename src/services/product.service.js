const Product = require("../models/Product");
const { cloudinary } = require("../config/cloudinary");
const createError = require("http-errors");

/**
 * Helper function to upload a file buffer to Cloudinary.
 * This centralizes the upload logic within the service.
 */
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "products" }, // Specific folder for products
      (error, result) => {
        if (error) {
          console.error("Service-level Cloudinary Upload Error:", error);
          return reject(createError(500, "Image could not be uploaded."));
        }
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

/*
CREATE PRODUCT
*/
exports.createProduct = async (data, files) => {
  // The route middleware ensures files exist, now we upload them here.
  if (!files || files.length === 0) {
    throw createError(400, "At least one product image is required.");
  }

  const uploadResults = await Promise.all(
    files.map(file => uploadToCloudinary(file.buffer))
  );
  const images = uploadResults.map(result => result.secure_url);
  const publicIds = uploadResults.map(result => result.public_id);
  const slug = data.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

  // Safely handle FAQs and Packages which might already be parsed by the controller
  let finalFaqs = [];
  if (Array.isArray(data.faqs)) {
    finalFaqs = data.faqs;
  } else if (typeof data.faqs === 'string' && data.faqs.trim()) {
    try {
      finalFaqs = JSON.parse(data.faqs);
    } catch (e) {
      finalFaqs = [];
    }
  }

  let finalPackages = [];
  if (Array.isArray(data.packages)) {
    finalPackages = data.packages;
  } else if (typeof data.packages === 'string' && data.packages.trim()) {
    try {
      finalPackages = JSON.parse(data.packages);
    } catch (e) {
      finalPackages = [];
    }
  }

  const product = new Product({
    ...data,
    slug,
    images: images,
    publicIds: publicIds,
    faqs: finalFaqs,
    packages: finalPackages
  });

  await product.save();
  return product;
};


/*
GET ALL PRODUCTS (with filtering and sorting)
*/
exports.getAllProducts = async (queryParams) => {
  const { category, sort, ids, status } = queryParams;
  let query = {};

  if (ids) {
    query._id = { $in: ids.split(',') };
  }
  if (category) {
    query.category = category;
  }
  
  // Filter by status if provided, or default to Active for store
  if (status && status !== 'all') {
    query.status = status;
  } else if (!status) {
    query.status = 'Active';
  }

  let apiQuery = Product.find(query);

  if (sort === 'Price: Low to High') {
    apiQuery = apiQuery.sort({ price: 1 });
  } else if (sort === 'Price: High to Low') {
    apiQuery = apiQuery.sort({ price: -1 });
  } else if (sort === 'Best selling') {
    apiQuery = apiQuery.sort({ numSales: -1 });
  } else {
    apiQuery = apiQuery.sort({ createdAt: -1 });
  }

  const products = await apiQuery.populate('category', 'name');
  return products;
};


/*
GET SINGLE PRODUCT BY ID
*/
exports.getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw createError(404, "Product not found");
  }
  return product;
};

/*
GET SINGLE PRODUCT BY SLUG
*/
exports.getProductBySlug = async (slug, includeInactive = false) => {
  const product = await Product.findOne({ slug }).populate('category', 'name');
  if (!product) {
    throw createError(404, "Product not found");
  }

  // If the product is Inactive and we are NOT looking for inactive ones (storefront view), deny access
  if (product.status !== 'Active' && !includeInactive) {
    throw createError(404, "Product not available"); // Use 404 to avoid leaking existence
  }

  return product;
};

/*
UPDATE PRODUCT
*/
exports.updateProduct = async (id, data, files) => {
  const product = await Product.findById(id);
  if (!product) {
    throw createError(404, "Product not found");
  }

  // --- 1. Handle Image Deletion ---
  if (data.imagesToDelete) {
    let urlsToDelete = [];
    try {
      // Frontend se JSON string aayega, use parse karein
      urlsToDelete = JSON.parse(data.imagesToDelete);
    } catch (e) {
      console.warn("Could not parse imagesToDelete JSON string:", data.imagesToDelete);
    }

    if (Array.isArray(urlsToDelete) && urlsToDelete.length > 0) {
      const publicIdsToDelete = new Set();
      const imagesToKeep = [];
      const publicIdsToKeep = [];

      product.images.forEach((imgUrl, index) => {
        if (urlsToDelete.includes(imgUrl)) {
          // Agar image delete karni hai, to uska publicId deletion set mein daalein
          publicIdsToDelete.add(product.publicIds[index]);
        } else {
          // Varna, use rakhein
          imagesToKeep.push(imgUrl);
          publicIdsToKeep.push(product.publicIds[index]);
        }
      });

      // Product ko filtered arrays ke saath update karein
      product.images = imagesToKeep;
      product.publicIds = publicIdsToKeep;

      // Cloudinary se asynchronously delete karein
      if (publicIdsToDelete.size > 0) {
        publicIdsToDelete.forEach(publicId => {
          if (publicId) {
            cloudinary.uploader.destroy(publicId).catch(err => console.error("Orphaned image cleanup failed:", err));
          }
        });
      }
    }
    // Is property ko data object se hata dein taaki ye galati se assign na ho
    delete data.imagesToDelete;
  }

  // --- 2. Handle New Image Uploads ---
  if (files && files.length > 0) {
    const uploadResults = await Promise.all(
      files.map(file => uploadToCloudinary(file.buffer))
    );
    
    const newImageUrls = uploadResults.map(result => result.secure_url);
    const newPublicIds = uploadResults.map(result => result.public_id);

    // Naye images aur IDs ko product ke arrays mein jodein
    product.images.push(...newImageUrls);
    product.publicIds.push(...newPublicIds);
  }

  // --- 3. Handle Text and other Data Updates ---
  // `images` aur `publicIds` ko data se hata dein taaki ye overwrite na hon
  delete data.images;
  delete data.publicIds;

  // FAQs aur Packages ko safely handle karein
  if (Object.prototype.hasOwnProperty.call(data, 'faqs')) {
    if (typeof data.faqs === 'string' && data.faqs.trim()) {
      try { data.faqs = JSON.parse(data.faqs); } catch (e) { delete data.faqs; }
    } else if (!Array.isArray(data.faqs)) { delete data.faqs; }
  }

  if (Object.prototype.hasOwnProperty.call(data, 'packages')) {
    if (typeof data.packages === 'string' && data.packages.trim()) {
      try { data.packages = JSON.parse(data.packages); } catch (e) { delete data.packages; }
    } else if (!Array.isArray(data.packages)) { delete data.packages; }
  }

  Object.assign(product, data);
  
  if (data.name) { product.slug = data.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''); }

  // --- 4. Save and Return ---
  try {
    const updatedDoc = await product.save();
    console.log("✅ Product successfully updated in DB:", { name: updatedDoc.name, images: updatedDoc.images });
    return updatedDoc;
  } catch (error) {
    console.error("❌ Mongoose Save Error:", error.message);
    throw error;
  }
};


/*
DELETE PRODUCT
*/
exports.deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw createError(404, "Product not found");
  }

  // Delete image from Cloudinary before deleting the product
  if (product.publicIds && product.publicIds.length > 0) {
    await Promise.all(product.publicIds.map(publicId => cloudinary.uploader.destroy(publicId)));
  }

  await product.deleteOne();
  return { message: "Product deleted successfully" };
};