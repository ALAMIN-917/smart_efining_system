/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Speed Zone Service — find which speed zone (geofence) contains a GPS point
 * ──────────────────────────────────────────────────────────────────────────────
 */

const SpeedZone = require("../models/SpeedZone");
const config = require("../config/efiningConfig");
const { haversineDistance } = require("./gpsService");

// In-memory cache of active zones.  Refreshed periodically so we don't
// hit the database on every single telemetry packet.
let _zonesCache = [];
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Refresh the zone cache from MongoDB if stale.
 */
async function refreshCache() {
  const now = Date.now();
  if (now - _cacheTimestamp < CACHE_TTL_MS && _zonesCache.length > 0) return;
  _zonesCache = await SpeedZone.find({ active: true }).lean();
  _cacheTimestamp = now;
}

/**
 * Force-refresh the zone cache (e.g. after admin edits a zone).
 */
async function invalidateCache() {
  _cacheTimestamp = 0;
  await refreshCache();
}

/**
 * Find the speed zone that contains the given point.
 *
 * If the point falls inside multiple zones, the smallest (most specific)
 * zone wins.  If no zone matches, returns null.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} [vehicleType] – optional, for type-specific limits
 * @returns {{ zoneId, name, speedLimit, radius } | null}
 */
async function findSpeedZone(lat, lng, vehicleType) {
  await refreshCache();

  let bestMatch = null;
  let bestDistance = Infinity;

  for (const zone of _zonesCache) {
    // Skip if zone is for a specific vehicle type and it doesn't match.
    if (
      zone.vehicleType !== "All" &&
      vehicleType &&
      zone.vehicleType !== vehicleType
    ) {
      continue;
    }

    const dist = haversineDistance(
      { latitude: lat, longitude: lng },
      { latitude: zone.center.latitude, longitude: zone.center.longitude }
    );

    if (dist <= zone.radius && dist < bestDistance) {
      bestDistance = dist;
      bestMatch = zone;
    }
  }

  if (!bestMatch) return null;

  return {
    zoneId: bestMatch.zoneId,
    name: bestMatch.name,
    speedLimit: bestMatch.speedLimit,
    radius: bestMatch.radius,
  };
}

/**
 * Get the applicable speed limit for a location.
 * Falls back to the system default if no zone matches.
 */
async function getApplicableSpeedLimit(lat, lng, vehicleType) {
  const zone = await findSpeedZone(lat, lng, vehicleType);
  return {
    speedLimit: zone ? zone.speedLimit : config.DEFAULT_SPEED_LIMIT_KMH,
    zone: zone || null,
  };
}

module.exports = { findSpeedZone, getApplicableSpeedLimit, invalidateCache };
