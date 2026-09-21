/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Speed Zone Controller — CRUD for geofenced speed limit zones
 * ──────────────────────────────────────────────────────────────────────────────
 */

const SpeedZone = require("../models/SpeedZone");
const { ApiError } = require("../middleware/errorHandler");
const { invalidateCache } = require("../services/speedZoneService");

// GET /api/speed-zones  (public — used by frontend map)
const listSpeedZones = async (req, res) => {
  const zones = await SpeedZone.find({ active: true })
    .sort({ name: 1 })
    .lean();
  res.json({ success: true, data: zones });
};

// GET /admin/api/speed-zones  (admin — all zones including inactive)
const adminListSpeedZones = async (req, res) => {
  const zones = await SpeedZone.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: zones });
};

// POST /admin/api/speed-zones
const createSpeedZone = async (req, res) => {
  const { zoneId, name, center, radius, speedLimit, vehicleType } = req.body;
  if (!zoneId || !name || !center || !speedLimit) {
    throw new ApiError(400, "zoneId, name, center and speedLimit are required.");
  }

  const zone = await SpeedZone.create({
    zoneId,
    name,
    center,
    radius: radius || 2000,
    speedLimit,
    vehicleType: vehicleType || "All",
  });

  await invalidateCache();
  res.status(201).json({ success: true, data: zone });
};

// PUT /admin/api/speed-zones/:zoneId
const updateSpeedZone = async (req, res) => {
  const allowed = ["name", "center", "radius", "speedLimit", "vehicleType", "active"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const zone = await SpeedZone.findOneAndUpdate(
    { zoneId: req.params.zoneId },
    updates,
    { new: true }
  );
  if (!zone) throw new ApiError(404, "Speed zone not found.");

  await invalidateCache();
  res.json({ success: true, data: zone });
};

// DELETE /admin/api/speed-zones/:zoneId  (soft delete — sets active=false)
const deleteSpeedZone = async (req, res) => {
  const zone = await SpeedZone.findOneAndUpdate(
    { zoneId: req.params.zoneId },
    { active: false },
    { new: true }
  );
  if (!zone) throw new ApiError(404, "Speed zone not found.");

  await invalidateCache();
  res.json({ success: true, data: zone });
};

module.exports = {
  listSpeedZones,
  adminListSpeedZones,
  createSpeedZone,
  updateSpeedZone,
  deleteSpeedZone,
};
