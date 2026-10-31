const mongoose = require("mongoose");

const bulkOrderSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    productRequired: {
      type: String,
      required: true,
    },

    quantity: {
      type: String,
      required: true,
    },

    packagingSize: {
      type: String,
      required: true,
    },

    packagingType: {
      type: String,
      required: true,
    },

    manufacturingRequirement: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BulkOrder", bulkOrderSchema);
