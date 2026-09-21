const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const GPSDevice = require("../models/GPSDevice");
const { ApiError } = require("../middleware/errorHandler");

const listDevices = async (req, res) => {
  const devices = await GPSDevice.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: devices });
};

// Issues a fresh API token for the device (shown once). Only its hash is stored.
const createDevice = async (req, res) => {
  const { deviceId, vehicleId } = req.body;
  if (!deviceId) throw new ApiError(400, "deviceId is required.");

  const rawToken = crypto.randomBytes(24).toString("hex");
  const apiTokenHash = await bcrypt.hash(rawToken, 10);

  const device = await GPSDevice.create({
    deviceId,
    vehicleId: vehicleId || null,
    status: "ACTIVE",
    apiTokenHash,
  });

  res.status(201).json({
    success: true,
    data: { ...device.toObject(), apiTokenHash: undefined },
    // Shown once at creation time only — the admin must copy it now.
    apiToken: rawToken,
  });
};

const updateDeviceStatus = async (req, res) => {
  const { status, vehicleId } = req.body;
  const updates = {};
  if (status) updates.status = status;
  if (vehicleId !== undefined) updates.vehicleId = vehicleId;

  const device = await GPSDevice.findOneAndUpdate({ deviceId: req.params.deviceId }, updates, { new: true });
  if (!device) throw new ApiError(404, "Device not found.");
  res.json({ success: true, data: device });
};

module.exports = { listDevices, createDevice, updateDeviceStatus };
