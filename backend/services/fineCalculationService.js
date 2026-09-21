/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Fine Calculation Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Determines the fine amount using the tiered policy defined in efiningConfig.
 * Amounts are PROTOTYPE / DEMO values and do NOT represent legal penalties.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const config = require("../config/efiningConfig");
const Fine = require("../models/Fine");
const { generateFineId } = require("../utils/generateIds");

/**
 * Calculate fine amount (BDT) for a given excess speed.
 * Returns 0 if excess is within the tolerance band.
 */
function calculateFineAmount(excessSpeed) {
  const excess = Math.round(excessSpeed);
  for (const tier of config.finePolicy.tiers) {
    if (excess >= tier.minExcess && excess <= tier.maxExcess) {
      return tier.amount;
    }
  }
  return config.finePolicy.defaultAmount;
}

/**
 * Create and persist a Fine document from a confirmed violation.
 *
 * @param {object} vehicle      – Vehicle document from DB
 * @param {object} telemetry    – Latest telemetry reading
 * @param {number} speedLimit   – Applicable speed limit
 * @param {number} excessSpeed  – How much over the limit
 * @param {string} [zoneDesc]   – Human-readable zone/road description
 * @returns {object} The created Fine document
 */
async function generateFine(vehicle, telemetry, speedLimit, excessSpeed, zoneDesc) {
  const fineAmount = calculateFineAmount(excessSpeed);
  if (fineAmount <= 0) return null; // within tolerance — no fine

  const fine = await Fine.create({
    fineId: generateFineId(),
    vehicleId: vehicle.vehicleId,
    deviceId: telemetry.deviceId,
    ownerName: vehicle.ownerName,
    registrationNumber: vehicle.registrationNumber,
    violationType: "Overspeeding",
    recordedSpeed: Math.round(telemetry.effectiveSpeed),
    allowedSpeed: speedLimit,
    location: {
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
      description: zoneDesc || "Unknown road segment",
    },
    violationDate: telemetry.timestamp || new Date(),
    fineAmount,
    status: "UNPAID",
  });

  console.log(
    `[FINE] Generated ${fine.fineId} | Vehicle: ${vehicle.vehicleId} | ` +
      `Speed: ${Math.round(telemetry.effectiveSpeed)} / ${speedLimit} km/h | ` +
      `Excess: +${Math.round(excessSpeed)} km/h | Amount: ${fineAmount} BDT`
  );

  return fine;
}

module.exports = { calculateFineAmount, generateFine };
