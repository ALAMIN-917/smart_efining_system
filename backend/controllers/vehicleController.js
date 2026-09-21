const Vehicle = require("../models/Vehicle");
const GPSDevice = require("../models/GPSDevice");
const { ApiError } = require("../middleware/errorHandler");

const listVehicles = async (req, res) => {
  const vehicles = await Vehicle.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: vehicles });
};

const createVehicle = async (req, res) => {
  const { vehicleId, registrationNumber, ownerName, ownerContact, vehicleType, deviceId } = req.body;
  if (!vehicleId || !registrationNumber || !ownerName) {
    throw new ApiError(400, "vehicleId, registrationNumber and ownerName are required.");
  }
  const vehicle = await Vehicle.create({
    vehicleId,
    registrationNumber,
    ownerName,
    ownerContact,
    vehicleType,
    deviceId: deviceId || null,
  });

  if (deviceId) {
    await GPSDevice.findOneAndUpdate({ deviceId }, { vehicleId }, { upsert: false });
  }

  res.status(201).json({ success: true, data: vehicle });
};

const updateVehicle = async (req, res) => {
  const allowed = ["registrationNumber", "ownerName", "ownerContact", "vehicleType", "deviceId", "isActive"];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

  const vehicle = await Vehicle.findOneAndUpdate({ vehicleId: req.params.vehicleId }, updates, { new: true });
  if (!vehicle) throw new ApiError(404, "Vehicle not found.");

  if (updates.deviceId) {
    await GPSDevice.findOneAndUpdate({ deviceId: updates.deviceId }, { vehicleId: vehicle.vehicleId });
  }

  res.json({ success: true, data: vehicle });
};

const deleteVehicle = async (req, res) => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { vehicleId: req.params.vehicleId },
    { isActive: false },
    { new: true }
  );
  if (!vehicle) throw new ApiError(404, "Vehicle not found.");
  res.json({ success: true, data: vehicle });
};

module.exports = { listVehicles, createVehicle, updateVehicle, deleteVehicle };
