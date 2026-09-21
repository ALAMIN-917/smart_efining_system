const mongoose = require("mongoose");
const Fine = require("../models/Fine");
const { ApiError } = require("../middleware/errorHandler");
const { generateFineId } = require("../utils/generateIds");

// Fields it's safe to hand to the public. Never spread the raw Mongo doc.
function toPublicFine(f) {
  return {
    fineId: f.fineId,
    vehicleId: f.vehicleId,
    registrationNumber: f.registrationNumber,
    ownerName: f.ownerName,
    violationType: f.violationType,
    recordedSpeed: f.recordedSpeed,
    allowedSpeed: f.allowedSpeed,
    excessSpeed: f.recordedSpeed - f.allowedSpeed,
    location: f.location?.description || null,
    violationDate: f.violationDate,
    fineAmount: f.fineAmount,
    status: f.status,
  };
}

// GET /api/fines/recent  — limited set for the homepage
const getRecentFines = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 6, 12);
  const fines = await Fine.find({ status: "UNPAID" })
    .sort({ violationDate: -1 })
    .limit(limit)
    .lean();
  res.json({ success: true, data: fines.map(toPublicFine) });
};

// GET /api/fines?status=UNPAID&page=&limit=&sort=&violationType=&q=
const getFines = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const status = ["UNPAID", "PAID", "CANCELLED"].includes(req.query.status)
    ? req.query.status
    : "UNPAID";

  const filter = { status };
  if (req.query.violationType && req.query.violationType !== "All") {
    filter.violationType = req.query.violationType === "Overspeeding" ? "Overspeeding" : "Other";
  }
  if (req.query.q) {
    const q = String(req.query.q).trim().slice(0, 100);
    filter.$or = [
      { fineId: new RegExp(q, "i") },
      { vehicleId: new RegExp(q, "i") },
      { registrationNumber: new RegExp(q, "i") },
      { ownerName: new RegExp(q, "i") },
    ];
  }

  let sortSpec = { violationDate: -1 };
  if (req.query.sort === "oldest") sortSpec = { violationDate: 1 };
  if (req.query.sort === "highest") sortSpec = { fineAmount: -1 };

  const [fines, total] = await Promise.all([
    Fine.find(filter)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Fine.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: fines.map(toPublicFine),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });
};

// GET /api/fines/:fineId
const getFineById = async (req, res) => {
  const fineId = String(req.params.fineId || "").trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(fineId)) {
    throw new ApiError(400, "Invalid fine identifier.");
  }
  const fine = await Fine.findOne({ fineId }).lean();
  if (!fine) throw new ApiError(404, "Fine not found.");
  res.json({ success: true, data: toPublicFine(fine) });
};

// GET /api/stats  — homepage counters
const getStats = async (req, res) => {
  const [outstanding, resolved] = await Promise.all([
    Fine.countDocuments({ status: "UNPAID" }),
    Fine.countDocuments({ status: "PAID" }),
  ]);
  res.json({ success: true, data: { outstanding, resolved } });
};

// ---- Admin-only below ----

// GET /admin/api/fines  (all statuses, admin view)
const adminListFines = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [fines, total] = await Promise.all([
    Fine.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Fine.countDocuments(filter),
  ]);
  res.json({ success: true, data: fines, pagination: { page, limit, total } });
};

// POST /admin/api/fines  — create a fine (simulates a detected violation)
const adminCreateFine = async (req, res) => {
  const {
    vehicleId,
    deviceId,
    ownerName,
    registrationNumber,
    violationType,
    recordedSpeed,
    allowedSpeed,
    location,
    violationDate,
    fineAmount,
  } = req.body;

  if (!vehicleId || !ownerName || !registrationNumber || !fineAmount) {
    throw new ApiError(400, "Missing required fine fields.");
  }

  const fine = await Fine.create({
    fineId: generateFineId(),
    vehicleId,
    deviceId: deviceId || null,
    ownerName,
    registrationNumber,
    violationType: violationType || "Overspeeding",
    recordedSpeed,
    allowedSpeed,
    location,
    violationDate: violationDate || new Date(),
    fineAmount,
    status: "UNPAID",
  });

  res.status(201).json({ success: true, data: fine });
};

// PATCH /admin/api/fines/:fineId
const adminUpdateFine = async (req, res) => {
  const allowed = ["ownerName", "registrationNumber", "violationType", "recordedSpeed", "allowedSpeed", "location", "fineAmount"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const fine = await Fine.findOneAndUpdate({ fineId: req.params.fineId }, updates, { new: true });
  if (!fine) throw new ApiError(404, "Fine not found.");
  res.json({ success: true, data: fine });
};

// PATCH /admin/api/fines/:fineId/cancel
const adminCancelFine = async (req, res) => {
  const fine = await Fine.findOne({ fineId: req.params.fineId });
  if (!fine) throw new ApiError(404, "Fine not found.");
  if (fine.status === "PAID") throw new ApiError(400, "Cannot cancel a paid fine.");
  fine.status = "CANCELLED";
  await fine.save();
  res.json({ success: true, data: fine });
};

module.exports = {
  getRecentFines,
  getFines,
  getFineById,
  getStats,
  adminListFines,
  adminCreateFine,
  adminUpdateFine,
  adminCancelFine,
};
