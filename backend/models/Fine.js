const mongoose = require("mongoose");

const FineSchema = new mongoose.Schema(
  {
    fineId: { type: String, required: true, unique: true, index: true },
    vehicleId: { type: String, required: true, index: true },
    deviceId: { type: String, default: null },

    ownerName: { type: String, required: true },
    registrationNumber: { type: String, required: true, index: true },

    violationType: {
      type: String,
      enum: ["Overspeeding", "Other"],
      default: "Overspeeding",
    },

    recordedSpeed: { type: Number, required: true },
    allowedSpeed: { type: Number, required: true },

    location: {
      latitude: Number,
      longitude: Number,
      description: String,
    },

    violationDate: { type: Date, required: true, default: Date.now },

    fineAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["UNPAID", "PAID", "CANCELLED"],
      default: "UNPAID",
      index: true,
    },
  },
  { timestamps: true }
);

// Public list = UNPAID, sorted by recency — this compound index serves it directly.
FineSchema.index({ status: 1, violationDate: -1 });

module.exports = mongoose.model("Fine", FineSchema);
