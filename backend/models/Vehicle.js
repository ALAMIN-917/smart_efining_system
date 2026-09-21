const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, required: true, unique: true, index: true },
    registrationNumber: { type: String, required: true, unique: true, index: true },
    ownerName: { type: String, required: true },
    ownerContact: { type: String, select: false }, // never sent to public API
    vehicleType: {
      type: String,
      enum: ["Car", "Motorcycle", "Bus", "Truck", "CNG", "Other"],
      default: "Car",
    },
    deviceId: { type: String, default: null, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);
