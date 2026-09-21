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

  // Resolve vehicle-specific speed limit if configured.
  let resolvedLimit = bestMatch.speedLimit;
  if (
    bestMatch.limitsByVehicle &&
    vehicleType &&
    bestMatch.limitsByVehicle[vehicleType] != null
  ) {
    resolvedLimit = bestMatch.limitsByVehicle[vehicleType];
  }

  return {
    zoneId: bestMatch.zoneId,
    name: bestMatch.name,
    roadCode: bestMatch.roadCode || "Highway",
    roadType: bestMatch.roadType || "National Highway",
    brtaCategory: bestMatch.brtaCategory || "NATIONAL_HIGHWAY",
    speedLimit: resolvedLimit,
    radius: bestMatch.radius,
  };
}

/**
 * Dynamic highway corridor detection according to BRTA 2024 Guidelines.
 * If a vehicle is not inside a specific pinpoint geofence, determine which
 * National Highway / road corridor it is travelling on.
 */
function matchHighwayCorridor(lat, lng, vehicleType = "Car") {
  const brta = config.brtaGuideline2024 ? config.brtaGuideline2024.categories : null;
  const defaultNational = { Car: 80, Bus: 70, Truck: 60, Motorcycle: 50, All: 80 };
  const defaultUrban = { Car: 40, Bus: 40, Truck: 30, Motorcycle: 30, All: 40 };
  const defaultExpress = { Car: 80, Bus: 80, Truck: 60, Motorcycle: 60, All: 80 };

  // N3 Corridor: Dhaka - Gazipur - Bhaluka - Trishal - Mymensingh (lat 23.90 - 24.80, lng 90.30 - 90.50)
  if (lat >= 23.90 && lat <= 24.80 && lng >= 90.30 && lng <= 90.50) {
    // Trishal Municipal area check (around 24.57 to 24.60, 90.38 to 90.41)
    if (lat >= 24.57 && lat <= 24.60 && lng >= 90.38 && lng <= 90.41) {
      const limits = brta?.URBAN_ROAD?.limits || defaultUrban;
      return {
        zoneId: "ZONE-DYN-N3-TRISHAL-URBAN",
        name: "N3 Highway — Trishal Municipal / Bazar Section",
        roadCode: "N3",
        roadType: "Urban Road",
        brtaCategory: "URBAN_ROAD",
        speedLimit: limits[vehicleType] || limits.All || 40,
        isDynamic: true,
      };
    }

    const limits = brta?.NATIONAL_HIGHWAY?.limits || defaultNational;
    return {
      zoneId: "ZONE-DYN-N3",
      name: "N3 Dhaka-Mymensingh National Highway (Trishal Section)",
      roadCode: "N3",
      roadType: "National Highway",
      brtaCategory: "NATIONAL_HIGHWAY",
      speedLimit: limits[vehicleType] || limits.All || 80,
      isDynamic: true,
    };
  }

  // N8 Corridor: Dhaka - Mawa - Padma Bridge - Bhanga Expressway (lat 23.25 - 23.75, lng 90.00 - 90.45)
  if (lat >= 23.25 && lat <= 23.75 && lng >= 90.00 && lng <= 90.45) {
    const limits = brta?.EXPRESSWAY?.limits || defaultExpress;
    return {
      zoneId: "ZONE-DYN-N8",
      name: "N8 Bangabandhu Expressway (Dhaka-Mawa-Bhanga)",
      roadCode: "N8",
      roadType: "Expressway",
      brtaCategory: "EXPRESSWAY",
      speedLimit: limits[vehicleType] || limits.All || 80,
      isDynamic: true,
    };
  }

  // Fallback Regional Highway per BRTA 2024
  const limits = brta?.REGIONAL_HIGHWAY?.limits || { Car: 70, Bus: 60, Truck: 50, Motorcycle: 50, All: 70 };
  return {
    zoneId: "ZONE-DYN-REGIONAL",
    name: "Regional Highway / Road Corridor",
    roadCode: "Highway",
    roadType: "Regional Highway",
    brtaCategory: "REGIONAL_HIGHWAY",
    speedLimit: limits[vehicleType] || limits.All || 70,
    isDynamic: true,
  };
}

/**
 * Get the applicable speed limit for a location.
 * Resolves specific geofenced zone first, then dynamic BRTA 2024 road corridor.
 */
async function getApplicableSpeedLimit(lat, lng, vehicleType = "Car") {
  const zone = await findSpeedZone(lat, lng, vehicleType);
  if (zone) {
    return {
      speedLimit: zone.speedLimit,
      zone,
      roadCode: zone.roadCode,
      roadType: zone.roadType,
    };
  }

  const dynamicMatch = matchHighwayCorridor(lat, lng, vehicleType);
  return {
    speedLimit: dynamicMatch.speedLimit,
    zone: dynamicMatch,
    roadCode: dynamicMatch.roadCode,
    roadType: dynamicMatch.roadType,
  };
}

module.exports = {
  findSpeedZone,
  getApplicableSpeedLimit,
  matchHighwayCorridor,
  invalidateCache,
};
