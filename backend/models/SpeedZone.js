const mongoose = require("mongoose");

const SpeedZoneSchema = new mongoose.Schema(
  {
    zoneId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },

    // Geofence: circle defined by center + radius.
    // Future extension: replace with GeoJSON geometry for road-segment matching.
    center: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    /** Radius in metres. */
    radius: { type: Number, required: true, default: 2000 },

    /** Speed limit in km/h for this zone. */
    speedLimit: { type: Number, required: true },

    /**
     * Optional vehicle-type restriction.  "All" means the limit applies to
     * every vehicle type.
     */
    vehicleType: {
      type: String,
      enum: ["All", "Car", "Motorcycle", "Bus", "Truck", "CNG", "Other"],
      default: "All",
    },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpeedZone", SpeedZoneSchema);
