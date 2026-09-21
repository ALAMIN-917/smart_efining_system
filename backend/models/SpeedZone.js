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

    /** Speed limit in km/h for this zone (general / car default). */
    speedLimit: { type: Number, required: true },

    /** Road Code (e.g. "N3", "N8", "N1", "N5", "R360"). */
    roadCode: { type: String, default: "Highway" },

    /** Road Classification Type under BRTA guidelines. */
    roadType: {
      type: String,
      default: "National Highway",
    },

    /** BRTA Guideline 2024 Category Identifier. */
    brtaCategory: {
      type: String,
      enum: ["EXPRESSWAY", "NATIONAL_HIGHWAY", "REGIONAL_HIGHWAY", "DISTRICT_ROAD", "URBAN_ROAD", "VULNERABLE_ZONE"],
      default: "NATIONAL_HIGHWAY",
    },

    /** Vehicle-type specific speed limits in km/h per BRTA 2024 guidelines. */
    limitsByVehicle: {
      Car: { type: Number, default: 80 },
      Microbus: { type: Number, default: 80 },
      SUV: { type: Number, default: 80 },
      Bus: { type: Number, default: 70 },
      Truck: { type: Number, default: 60 },
      Motorcycle: { type: Number, default: 50 },
      CNG: { type: Number, default: 30 },
      All: { type: Number, default: 80 },
    },

    /**
     * Optional vehicle-type restriction. "All" means the limit applies to
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
