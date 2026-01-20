// models/Sales.js
const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  product: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  revenue: {
    type: Number,
    required: true
  },

  // 🔹 Versioning fields
  version: {
    type: Number,
    default: 1
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // For batching if needed
  batchId: {
    type: String,
    default: "default"
  },

  source: {
    type: String,
    default: "database"
  }
}, { timestamps: true });

module.exports = mongoose.model("Sales", salesSchema);
