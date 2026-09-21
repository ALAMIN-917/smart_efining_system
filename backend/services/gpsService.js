/**
 * ──────────────────────────────────────────────────────────────────────────────
 * GPS Service — coordinate validation, Haversine distance, speed calculation
 * ──────────────────────────────────────────────────────────────────────────────
 */

const config = require("../config/efiningConfig");

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000; // mean radius in metres

/**
 * Haversine distance between two {lat, lng} points in metres.
 */
function haversineDistance(p1, p2) {
  const dLat = (p2.latitude - p1.latitude) * DEG_TO_RAD;
  const dLng = (p2.longitude - p1.longitude) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.latitude * DEG_TO_RAD) *
      Math.cos(p2.latitude * DEG_TO_RAD) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reject coordinates that are obviously invalid:
 *  - 0/0  (GPS default before lock)
 *  - outside Bangladesh bounding box (configurable)
 *  - NaN / undefined
 */
function validateCoordinates(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  const { latMin, latMax, lngMin, lngMax } = config.gps.BOUNDS;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

/**
 * Full telemetry payload validation.
 */
function isValidTelemetry(data) {
  if (!data || !data.deviceId) return false;
  if (!validateCoordinates(data.latitude, data.longitude)) return false;
  // If satellites field is present, enforce minimum.
  if (
    data.satellites != null &&
    data.satellites < config.gps.MIN_SATELLITES
  ) {
    return false;
  }
  return true;
}

/**
 * Calculate speed (km/h) between two telemetry points.
 * Returns null if elapsed time is zero or negative.
 */
function calculateSpeed(prev, current) {
  const distM = haversineDistance(prev, current);
  // Ignore micro-movements (GPS jitter).
  if (distM < config.gps.MIN_MOVEMENT_THRESHOLD_M) return 0;

  const t1 = new Date(prev.timestamp).getTime();
  const t2 = new Date(current.timestamp).getTime();
  const elapsedS = (t2 - t1) / 1000;
  if (elapsedS <= 0) return null;

  const speedKmh = (distM / elapsedS) * 3.6;

  // Reject physically impossible speeds (likely GPS jump).
  if (speedKmh > config.gps.MAX_PLAUSIBLE_SPEED_KMH) return null;
  return Math.round(speedKmh * 10) / 10; // 1 decimal
}

/**
 * Determine the effective speed from GPS-reported and calculated values.
 * Strategy: prefer GPS speed when valid; fall back to calculated.
 */
function determineEffectiveSpeed(gpsSpeed, calculatedSpeed) {
  if (
    gpsSpeed != null &&
    gpsSpeed >= 0 &&
    gpsSpeed <= config.gps.MAX_PLAUSIBLE_SPEED_KMH
  ) {
    return gpsSpeed;
  }
  if (calculatedSpeed != null && calculatedSpeed >= 0) {
    return calculatedSpeed;
  }
  return null;
}

module.exports = {
  haversineDistance,
  validateCoordinates,
  isValidTelemetry,
  calculateSpeed,
  determineEffectiveSpeed,
};
