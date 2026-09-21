/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Violation Detection Service — the core engine
 * ──────────────────────────────────────────────────────────────────────────────
 * Tracks per-vehicle overspeed state in memory and transitions through:
 *
 *   NORMAL  →  WARNING  →  OVERSPEED  →  VIOLATION  (fine generated)
 *                                               ↓
 *                                          COOLDOWN
 *                                               ↓
 *                                           NORMAL
 *
 * Key design decisions:
 *  – In-memory state is acceptable for a single-server prototype.
 *  – State is never persisted to the database — if the server restarts,
 *    all vehicles start from NORMAL.  This is intentional: false negatives
 *    are far safer than false positives for a fine-issuing system.
 *  – Duplicate fines for the same continuous violation are prevented by
 *    a per-vehicle cooldown timer.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const config = require("../config/efiningConfig");
const { generateFine } = require("./fineCalculationService");

/**
 * Per-vehicle tracking state.
 * Key: vehicleId → { status, consecutiveCount, firstOverspeedAt, lastFineAt }
 */
const vehicleStates = new Map();

function getState(vehicleId) {
  if (!vehicleStates.has(vehicleId)) {
    vehicleStates.set(vehicleId, {
      status: "NORMAL",
      consecutiveCount: 0,
      firstOverspeedAt: null,
      lastFineAt: null,
    });
  }
  return vehicleStates.get(vehicleId);
}

/**
 * Evaluate a single telemetry reading and decide the vehicle's current status.
 *
 * @param {object} params
 * @param {object} params.vehicle        – Vehicle document
 * @param {object} params.telemetry      – Enriched telemetry (effectiveSpeed set)
 * @param {number} params.speedLimit     – Applicable speed limit (km/h)
 * @param {string} [params.zoneName]     – Name of matched speed zone
 * @returns {{ status, fineGenerated, fine }}
 */
async function evaluate({ vehicle, telemetry, speedLimit, zoneName }) {
  const state = getState(vehicle.vehicleId);
  const speed = telemetry.effectiveSpeed;
  const now = Date.now();
  const tolerance = config.violation.OVERSPEED_TOLERANCE_KMH;
  const excess = speed - speedLimit;

  // ── Still in cooldown after a recent fine? ────────────────────────────
  if (state.lastFineAt) {
    const elapsed = (now - state.lastFineAt) / 1000;
    if (elapsed < config.violation.COOLDOWN_S) {
      // During cooldown, if speed drops back to normal, reset state.
      if (excess <= 0) {
        state.status = "NORMAL";
        state.consecutiveCount = 0;
        state.firstOverspeedAt = null;
      }
      return { status: state.status, fineGenerated: false, fine: null };
    }
    // Cooldown expired — allow new violations.
    state.lastFineAt = null;
  }

  // ── Speed is within the limit ─────────────────────────────────────────
  if (excess <= 0) {
    state.status = "NORMAL";
    state.consecutiveCount = 0;
    state.firstOverspeedAt = null;

    console.log(
      `[SPEED] ${vehicle.vehicleId} | ${Math.round(speed)} / ${speedLimit} km/h | NORMAL`
    );
    return { status: "NORMAL", fineGenerated: false, fine: null };
  }

  // ── Over the limit but within tolerance ───────────────────────────────
  if (excess > 0 && excess <= tolerance) {
    state.status = "WARNING";
    state.consecutiveCount = 0;
    state.firstOverspeedAt = null;

    console.log(
      `[SPEED] ${vehicle.vehicleId} | ${Math.round(speed)} / ${speedLimit} km/h | ` +
        `WARNING (+${Math.round(excess)} km/h, within tolerance)`
    );
    return { status: "WARNING", fineGenerated: false, fine: null };
  }

  // ── Over the limit + tolerance → potential violation ──────────────────
  state.consecutiveCount += 1;
  if (!state.firstOverspeedAt) state.firstOverspeedAt = now;
  const durationS = (now - state.firstOverspeedAt) / 1000;

  console.log(
    `[SPEED] ${vehicle.vehicleId} | ${Math.round(speed)} / ${speedLimit} km/h | ` +
      `OVERSPEED (+${Math.round(excess)} km/h) | ` +
      `consecutive=${state.consecutiveCount} duration=${Math.round(durationS)}s`
  );

  // Check if both conditions are met for a confirmed violation.
  if (
    state.consecutiveCount >= config.violation.MIN_CONSECUTIVE_READINGS &&
    durationS >= config.violation.MIN_VIOLATION_DURATION_S
  ) {
    state.status = "VIOLATION";
    state.lastFineAt = now;
    state.consecutiveCount = 0;
    state.firstOverspeedAt = null;

    // Generate the fine.
    const fine = await generateFine(
      vehicle,
      telemetry,
      speedLimit,
      excess,
      zoneName
    );

    console.log(
      `[VIOLATION] Confirmed for ${vehicle.vehicleId} | Fine: ${fine?.fineId || "NONE"}`
    );

    return { status: "VIOLATION", fineGenerated: !!fine, fine };
  }

  // Not yet confirmed — vehicle is in OVERSPEED state.
  state.status = "OVERSPEED";
  return { status: "OVERSPEED", fineGenerated: false, fine: null };
}

/**
 * Get the current in-memory status for a vehicle.
 */
function getVehicleStatus(vehicleId) {
  return getState(vehicleId).status;
}

/**
 * Reset a vehicle's state (e.g. for testing / simulation reset).
 */
function resetVehicle(vehicleId) {
  vehicleStates.delete(vehicleId);
}

module.exports = { evaluate, getVehicleStatus, resetVehicle };
