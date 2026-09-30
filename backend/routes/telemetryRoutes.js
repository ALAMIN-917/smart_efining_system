const express = require("express");
const { asyncHandler } = require("../middleware/auth");
const {
  ingestTelemetry,
  simulateTelemetry,
  getVehicleLocation,
  getVehicleStatus,
  getVehicleTrail,
  clearVehicleTrail,
  getLatestTelemetry,
} = require("../controllers/telemetryController");

const router = express.Router();

// ESP32 telemetry ingestion — the core endpoint.
router.post("/telemetry", asyncHandler(ingestTelemetry));

// Latest telemetry for a specific device (used by frontend on page load).
router.get("/telemetry/latest/:deviceId", asyncHandler(getLatestTelemetry));

// Simulation endpoint (no auth required for demo convenience).
router.post("/telemetry/simulate", asyncHandler(simulateTelemetry));

// Vehicle location, status, and trail queries.
router.get("/vehicles/:vehicleId/location", asyncHandler(getVehicleLocation));
router.get("/vehicles/:vehicleId/status", asyncHandler(getVehicleStatus));
router.get("/vehicles/:vehicleId/trail", asyncHandler(getVehicleTrail));
router.delete("/vehicles/:vehicleId/trail", asyncHandler(clearVehicleTrail));

module.exports = router;

