const mongoose = require("mongoose");
const config = require("../config/efiningConfig");

const TelemetrySchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    vehicleId: { type: String, index: true },

    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },

    /** Speed reported by the NEO-6M GPS via TinyGPS++ (km/h). */
    gpsSpeed: { type: Number, default: null },

    /** Speed calculated on the backend from consecutive coordinates (km/h). */
    calculatedSpeed: { type: Number, default: null },

    /** The speed the system actually used for violation checks (km/h). */
    effectiveSpeed: { type: Number, default: null },

    satellites: { type: Number, default: null },

    /** Matched speed zone, if any. */
    speedZoneId: { type: String, default: null },
    allowedSpeed: { type: Number, default: null },

    /**
     * Status determined by the violation engine at the time this reading
     * was processed.
     */
    status: {
      type: String,
      enum: ["NORMAL", "WARNING", "OVERSPEED", "VIOLATION"],
      default: "NORMAL",
    },

    /** Timestamp from the ESP32 (or server receive time if not provided). */
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for querying recent telemetry per vehicle.
TelemetrySchema.index({ vehicleId: 1, timestamp: -1 });

// TTL: auto-delete raw telemetry after the configured retention period.
TelemetrySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: config.telemetry.TTL_DAYS * 86400 }
);

module.exports = mongoose.model("Telemetry", TelemetrySchema);
