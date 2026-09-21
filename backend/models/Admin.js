const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, default: "SUPER_ADMIN" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", AdminSchema);
