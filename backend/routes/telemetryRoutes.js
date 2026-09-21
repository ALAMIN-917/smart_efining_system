const express = require("express");
const { asyncHandler } = require("../middleware/auth");
const {
  ingestTelemetry,
  simulateTelemetry,
  getVehicleLocation,
  getVehicleStatus,
  getVehicleTrail,
} = require("../controllers/telemetryController");

const router = express.Router();

// ESP32 telemetry ingestion — the core endpoint.
router.post("/telemetry", asyncHandler(ingestTelemetry));

// Simulation endpoint (no auth required for demo convenience).
router.post("/telemetry/simulate", asyncHandler(simulateTelemetry));

// Vehicle location & status queries.
router.get("/vehicles/:vehicleId/location", asyncHandler(getVehicleLocation));
router.get("/vehicles/:vehicleId/status", asyncHandler(getVehicleStatus));
router.get("/vehicles/:vehicleId/trail", asyncHandler(getVehicleTrail));

module.exports = router;
