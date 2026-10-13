const mongoose = require('mongoose');

const merchantSyncQueueSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true, // Guarantees at most one pending task per product
  },
  operation: {
    type: String,
    enum: ['UPSERT', 'DELETE'],
    default: 'UPSERT',
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'FAILED', 'COMPLETED'],
    default: 'PENDING',
    index: true,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 5,
  },
  lastError: {
    type: String,
  },
  nextRetryAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  attempts: [{
    timestamp: { type: Date, default: Date.now },
    error: { type: String },
    success: { type: Boolean },
  }],
}, { timestamps: true });

merchantSyncQueueSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.model('MerchantSyncQueue', merchantSyncQueueSchema);
