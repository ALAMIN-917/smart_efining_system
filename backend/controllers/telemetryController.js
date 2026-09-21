/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Telemetry Controller
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles incoming GPS telemetry from ESP32 devices and simulation requests.
 * This is the main ingestion pipeline:
 *
 *   ESP32 POST → validate → lookup device/vehicle → calculate speed →
 *   find speed zone → violation engine → store telemetry → SSE broadcast →
 *   respond to ESP32
 * ──────────────────────────────────────────────────────────────────────────────
 */

const Telemetry = require("../models/Telemetry");
const GPSDevice = require("../models/GPSDevice");
const Vehicle = require("../models/Vehicle");
const config = require("../config/efiningConfig");
const { ApiError } = require("../middleware/errorHandler");

const gps = require("../services/gpsService");
const speedZoneSvc = require("../services/speedZoneService");
const violationSvc = require("../services/violationService");
const { broadcast } = require("../services/sseService");

// ── In-memory store for previous readings (for calculated speed) ────────
const previousReadings = new Map(); // deviceId → { latitude, longitude, timestamp }

/**
 * POST /api/telemetry
 *
 * Accepts GPS telemetry from an ESP32 device.
 * Body: { deviceId, latitude, longitude, gpsSpeed?, satellites?, timestamp?, vehicleId? }
 *
 * Returns a status response the ESP32 can display on its serial monitor.
 */
const ingestTelemetry = async (req, res) => {
  const {
    deviceId,
    latitude,
    longitude,
    gpsSpeed,
    satellites,
    timestamp,
    vehicleId: bodyVehicleId,
  } = req.body;

  // ── 1. Basic validation ───────────────────────────────────────────────
  if (!deviceId) throw new ApiError(400, "deviceId is required.");
  if (!gps.isValidTelemetry(req.body)) {
    throw new ApiError(400, "Invalid or insufficient GPS data.");
  }

  console.log(
    `\n[GPS] Device: ${deviceId} | Lat: ${latitude} | Lng: ${longitude} | ` +
      `GPS Speed: ${gpsSpeed ?? "N/A"} | Satellites: ${satellites ?? "N/A"}`
  );

  // ── 2. Look up device → vehicle ──────────────────────────────────────
  let device = await GPSDevice.findOne({ deviceId });
  if (!device) {
    // Auto-register unknown devices for ease of prototyping.
    device = await GPSDevice.create({
      deviceId,
      vehicleId: bodyVehicleId || null,
      status: "ACTIVE",
    });
    console.log(`[GPS] Auto-registered device: ${deviceId}`);
  }

  // Update last-seen timestamp.
  device.lastSeen = new Date();
  await device.save();

  const vehicleId = device.vehicleId || bodyVehicleId || null;
  let vehicle = null;
  if (vehicleId) {
    vehicle = await Vehicle.findOne({ vehicleId }).lean();
  }

  // ── 3. Speed calculation ──────────────────────────────────────────────
  let calculatedSpeed = null;
  const prevReading = previousReadings.get(deviceId);
  const now = timestamp ? new Date(timestamp) : new Date();

  if (prevReading) {
    calculatedSpeed = gps.calculateSpeed(prevReading, {
      latitude,
      longitude,
      timestamp: now,
    });
  }

  // Store current reading for next calculation.
  previousReadings.set(deviceId, { latitude, longitude, timestamp: now });

  const effectiveSpeed = gps.determineEffectiveSpeed(gpsSpeed, calculatedSpeed);

  if (calculatedSpeed != null) {
    console.log(
      `[SPEED] GPS Speed: ${gpsSpeed ?? "N/A"} | Calculated: ${calculatedSpeed} | ` +
        `Effective: ${effectiveSpeed}`
    );
  }

  // ── 4. Speed zone lookup ──────────────────────────────────────────────
  const vehicleType = vehicle?.vehicleType || "Car";
  const { speedLimit, zone } = await speedZoneSvc.getApplicableSpeedLimit(
    latitude,
    longitude,
    vehicleType
  );

  if (zone) {
    console.log(`[ROAD] Zone: ${zone.name} | Limit: ${speedLimit} km/h`);
  } else {
    console.log(`[ROAD] No zone matched — using default: ${speedLimit} km/h`);
  }

  // ── 5. Violation detection ────────────────────────────────────────────
  let status = "NORMAL";
  let fineGenerated = false;
  let generatedFine = null;

  const telemetryData = {
    deviceId,
    latitude,
    longitude,
    gpsSpeed,
    calculatedSpeed,
    effectiveSpeed,
    satellites,
    timestamp: now,
  };

  if (vehicle && effectiveSpeed != null) {
    const result = await violationSvc.evaluate({
      vehicle,
      telemetry: telemetryData,
      speedLimit,
      zoneName: zone?.name,
    });
    status = result.status;
    fineGenerated = result.fineGenerated;
    generatedFine = result.fine;
  }

  // ── 6. Store telemetry ────────────────────────────────────────────────
  const telemetryDoc = await Telemetry.create({
    deviceId,
    vehicleId,
    latitude,
    longitude,
    gpsSpeed,
    calculatedSpeed,
    effectiveSpeed,
    satellites,
    speedZoneId: zone?.zoneId || null,
    allowedSpeed: speedLimit,
    status,
    timestamp: now,
  });

  // ── 7. Broadcast via SSE ──────────────────────────────────────────────
  const ssePayload = {
    deviceId,
    vehicleId,
    registrationNumber: vehicle?.registrationNumber || null,
    ownerName: vehicle?.ownerName || null,
    latitude,
    longitude,
    speed: effectiveSpeed,
    allowedSpeed: speedLimit,
    zoneName: zone?.name || null,
    status,
    timestamp: now.toISOString(),
    fineId: generatedFine?.fineId || null,
    fineAmount: generatedFine?.fineAmount || null,
  };

  broadcast("telemetry", ssePayload);

  if (status === "WARNING" || status === "OVERSPEED") {
    broadcast("warning", ssePayload);
  }
  if (fineGenerated) {
    broadcast("violation", ssePayload);
  }

  // ── 8. Respond to ESP32 ───────────────────────────────────────────────
  const espResponse = {
    status,
    speed: effectiveSpeed != null ? Math.round(effectiveSpeed) : null,
    allowedSpeed: speedLimit,
  };

  if (status === "WARNING") {
    espResponse.message = "Reduce speed";
  }
  if (fineGenerated && generatedFine) {
    espResponse.fineId = generatedFine.fineId;
    espResponse.fineAmount = generatedFine.fineAmount;
  }

  res.json(espResponse);
};

/**
 * POST /api/telemetry/simulate
 *
 * Simulation endpoint — same pipeline but accepts speed / coordinates directly.
 * Used for testing the system without physical hardware.
 */
const simulateTelemetry = async (req, res) => {
  // Reuse ingestTelemetry by forwarding the request body with defaults.
  const defaults = {
    deviceId: req.body.deviceId || "ESP32-DVC-45821",
    latitude: req.body.latitude ?? 23.4721,
    longitude: req.body.longitude ?? 90.2814,
    gpsSpeed: req.body.gpsSpeed ?? req.body.speed ?? 72,
    satellites: req.body.satellites ?? 10,
    timestamp: new Date().toISOString(),
    vehicleId: req.body.vehicleId || "VH-10294",
  };

  // Overwrite req.body so the main ingestion pipeline processes it.
  req.body = defaults;
  return ingestTelemetry(req, res);
};

/**
 * GET /api/vehicles/:vehicleId/location
 *
 * Returns the latest telemetry reading for a specific vehicle.
 */
const getVehicleLocation = async (req, res) => {
  const { vehicleId } = req.params;
  const latest = await Telemetry.findOne({ vehicleId })
    .sort({ timestamp: -1 })
    .lean();

  if (!latest) throw new ApiError(404, "No telemetry data found for this vehicle.");

  res.json({
    success: true,
    data: {
      vehicleId: latest.vehicleId,
      latitude: latest.latitude,
      longitude: latest.longitude,
      speed: latest.effectiveSpeed,
      allowedSpeed: latest.allowedSpeed,
      status: latest.status,
      timestamp: latest.timestamp,
      satellites: latest.satellites,
    },
  });
};

/**
 * GET /api/vehicles/:vehicleId/status
 *
 * Returns the current in-memory violation state + latest telemetry.
 */
const getVehicleStatus = async (req, res) => {
  const { vehicleId } = req.params;

  const vehicle = await Vehicle.findOne({ vehicleId }).lean();
  if (!vehicle) throw new ApiError(404, "Vehicle not found.");

  const latest = await Telemetry.findOne({ vehicleId })
    .sort({ timestamp: -1 })
    .lean();

  const currentStatus = violationSvc.getVehicleStatus(vehicleId);

  res.json({
    success: true,
    data: {
      vehicleId: vehicle.vehicleId,
      registrationNumber: vehicle.registrationNumber,
      ownerName: vehicle.ownerName,
      vehicleType: vehicle.vehicleType,
      deviceId: vehicle.deviceId,
      currentStatus,
      latestTelemetry: latest
        ? {
            latitude: latest.latitude,
            longitude: latest.longitude,
            speed: latest.effectiveSpeed,
            allowedSpeed: latest.allowedSpeed,
            zoneName: latest.speedZoneId,
            timestamp: latest.timestamp,
            satellites: latest.satellites,
          }
        : null,
    },
  });
};

/**
 * GET /api/vehicles/:vehicleId/trail
 *
 * Returns recent telemetry points for map polyline drawing.
 */
const getVehicleTrail = async (req, res) => {
  const { vehicleId } = req.params;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || config.telemetry.MAX_TRAIL_POINTS,
    100
  );

  const points = await Telemetry.find({ vehicleId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select("latitude longitude effectiveSpeed allowedSpeed status timestamp")
    .lean();

  res.json({ success: true, data: points.reverse() });
};

module.exports = {
  ingestTelemetry,
  simulateTelemetry,
  getVehicleLocation,
  getVehicleStatus,
  getVehicleTrail,
};
