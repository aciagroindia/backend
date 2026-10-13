const mongoose = require('mongoose');

const merchantSyncLogSchema = new mongoose.Schema({
  trigger: {
    type: String,
    enum: ['manual', 'cron', 'event_update', 'test'],
    default: 'manual',
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed'],
    default: 'in_progress',
  },
  totalProducts: {
    type: Number,
    default: 0,
  },
  successCount: {
    type: Number,
    default: 0,
  },
  failureCount: {
    type: Number,
    default: 0,
  },
  syncErrors: [{
    productId: { type: String },
    productName: { type: String },
    errorMessage: { type: String },
    timestamp: { type: Date, default: Date.now },
  }],
  durationMs: {
    type: Number,
  },
  details: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('MerchantSyncLog', merchantSyncLogSchema);
