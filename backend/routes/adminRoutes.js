const express = require("express");
const { asyncHandler, requireAdmin } = require("../middleware/auth");
const { login, dashboard, listPayments } = require("../controllers/adminController");
const {
  adminListFines,
  adminCreateFine,
  adminUpdateFine,
  adminCancelFine,
} = require("../controllers/fineController");
const { listVehicles, createVehicle, updateVehicle, deleteVehicle } = require("../controllers/vehicleController");
const { listDevices, createDevice, updateDeviceStatus } = require("../controllers/deviceController");
const {
  adminListSpeedZones,
  createSpeedZone,
  updateSpeedZone,
  deleteSpeedZone,
} = require("../controllers/speedZoneController");

const router = express.Router();

// Public within /admin: login only.
router.post("/auth/login", asyncHandler(login));

// Everything below requires a valid admin JWT.
router.use(requireAdmin);

router.get("/dashboard", asyncHandler(dashboard));
router.get("/payments", asyncHandler(listPayments));

router.get("/fines", asyncHandler(adminListFines));
router.post("/fines", asyncHandler(adminCreateFine));
router.patch("/fines/:fineId", asyncHandler(adminUpdateFine));
router.patch("/fines/:fineId/cancel", asyncHandler(adminCancelFine));

router.get("/vehicles", asyncHandler(listVehicles));
router.post("/vehicles", asyncHandler(createVehicle));
router.patch("/vehicles/:vehicleId", asyncHandler(updateVehicle));
router.delete("/vehicles/:vehicleId", asyncHandler(deleteVehicle));

router.get("/devices", asyncHandler(listDevices));
router.post("/devices", asyncHandler(createDevice));
router.patch("/devices/:deviceId", asyncHandler(updateDeviceStatus));

// Speed Zone management
router.get("/speed-zones", asyncHandler(adminListSpeedZones));
router.post("/speed-zones", asyncHandler(createSpeedZone));
router.put("/speed-zones/:zoneId", asyncHandler(updateSpeedZone));
router.delete("/speed-zones/:zoneId", asyncHandler(deleteSpeedZone));

module.exports = router;

