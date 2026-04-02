const User = require("../models/User");
const createError = require("http-errors");
const { cloudinary } = require("../config/cloudinary");

/**
 * Helper function to upload a file buffer to Cloudinary
 */
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "avatars" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

exports.getAdminProfile = async (userId) => {
  const user = await User.findById(userId).select('name email avatar role');
  if (!user) {
    throw createError(404, "User not found");
  }
  return user;
};

exports.updateAdminProfile = async (userId, data = {}, file) => {
  // First, find the user to check for existence and get old avatar ID
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, "User not found");
  }

  const updateData = {};

  if (file) {
    // If there's an old avatar, schedule its deletion from Cloudinary
    if (user.avatarPublicId) {
      // No need to await, let it run in the background
      cloudinary.uploader.destroy(user.avatarPublicId).catch(err => 
        console.error("Orphaned avatar cleanup failed:", err)
      );
    }
    const uploadResult = await uploadToCloudinary(file.buffer);
    updateData.avatar = uploadResult.secure_url;
    updateData.avatarPublicId = uploadResult.public_id;
  }

  // Add name and email to updateData if they are provided
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;

  // Use findByIdAndUpdate with $set to prevent the password from being re-hashed.
  // This avoids triggering the 'save' middleware.
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, select: 'name email avatar role' } // Return the updated user with selected fields
  );

  return updatedUser;
};

exports.changeAdminPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, "User not found");
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw createError(401, "Incorrect current password");
  }

  user.password = newPassword;
  await user.save();

  return { message: "Password updated successfully" };
};

exports.getAdminPreferences = async (userId) => {
  const user = await User.findById(userId).select('preferences');
  if (!user) {
    throw createError(404, "User not found");
  }
  return user.preferences;
};

exports.updateAdminPreferences = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, "User not found");
  }

  if (data.emailNotifications !== undefined) {
    user.preferences.emailNotifications = data.emailNotifications;
  }

  if (data.language) {
    user.preferences.language = data.language;
  }

  await user.save();
  return user.preferences;
};