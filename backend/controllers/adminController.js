const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Vehicle = require("../models/Vehicle");
const GPSDevice = require("../models/GPSDevice");
const Fine = require("../models/Fine");
const Payment = require("../models/Payment");
const { ApiError } = require("../middleware/errorHandler");

// POST /admin/api/auth/login
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw new ApiError(400, "Username and password are required.");

  const admin = await Admin.findOne({ username }).select("+passwordHash");
  if (!admin) throw new ApiError(401, "Invalid credentials.");

  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) throw new ApiError(401, "Invalid credentials.");

  const token = jwt.sign(
    { adminId: admin._id.toString(), username: admin.username, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  res.json({ success: true, data: { token, username: admin.username, role: admin.role } });
};

// GET /admin/api/dashboard
const dashboard = async (req, res) => {
  const [totalVehicles, activeDevices, outstanding, paid, amountAgg, collectedAgg] = await Promise.all([
    Vehicle.countDocuments({ isActive: true }),
    GPSDevice.countDocuments({ status: "ACTIVE" }),
    Fine.countDocuments({ status: "UNPAID" }),
    Fine.countDocuments({ status: "PAID" }),
    Fine.aggregate([{ $group: { _id: null, total: { $sum: "$fineAmount" } } }]),
    Payment.aggregate([{ $match: { status: "SUCCEEDED" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);

  res.json({
    success: true,
    data: {
      totalVehicles,
      activeDevices,
      outstandingFines: outstanding,
      paidFines: paid,
      totalFineAmount: amountAgg[0]?.total || 0,
      collectedAmount: collectedAgg[0]?.total || 0,
    },
  });
};

// GET /admin/api/payments
const listPayments = async (req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, data: payments });
};

module.exports = { login, dashboard, listPayments };
