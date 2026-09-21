const mongoose = require("mongoose");

const GPSDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    vehicleId: { type: String, default: null, index: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    // Never exposed on any public route — used only by the authenticated
    // ESP32 telemetry ingestion pipeline (out of scope for this prototype).
    apiTokenHash: { type: String, select: false },
    lastSeen: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GPSDevice", GPSDeviceSchema);
