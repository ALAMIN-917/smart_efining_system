const express = require("express");
const { asyncHandler } = require("../middleware/auth");
const { listSpeedZones } = require("../controllers/speedZoneController");

const router = express.Router();

// Public — used by the frontend live map to display speed zones.
router.get("/speed-zones", asyncHandler(listSpeedZones));

module.exports = router;
