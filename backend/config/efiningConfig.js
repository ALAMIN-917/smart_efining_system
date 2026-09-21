/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Smart E-Fining System — Centralized Configuration
 * ──────────────────────────────────────────────────────────────────────────────
 * All tunable parameters live here so they can be adjusted without hunting
 * through business-logic files.  Values are PROTOTYPE / DEMO defaults and
 * do NOT represent actual legal enforcement policy.
 * ──────────────────────────────────────────────────────────────────────────────
 */

module.exports = {
  /* ── GPS validation ────────────────────────────────────────────────────── */
  gps: {
    /** Minimum satellites before a reading is considered reliable. */
    MIN_SATELLITES: 4,
    /** Bangladesh bounding box — reject anything wildly outside. */
    BOUNDS: { latMin: 20.5, latMax: 26.7, lngMin: 88.0, lngMax: 92.7 },
    /** Ignore movement smaller than this (metres) to reduce GPS jitter. */
    MIN_MOVEMENT_THRESHOLD_M: 3,
    /** Maximum plausible speed (km/h). Readings above this are noise. */
    MAX_PLAUSIBLE_SPEED_KMH: 250,
  },

  /* ── Speed & violation detection ───────────────────────────────────────── */
  violation: {
    /**
     * Tolerance above the speed limit (km/h).
     * effectiveSpeed must exceed  speedLimit + TOLERANCE  to trigger a warning.
     */
    OVERSPEED_TOLERANCE_KMH: 5,
    /**
     * Number of consecutive overspeed telemetry readings required before
     * a WARNING escalates to a confirmed VIOLATION.
     */
    MIN_CONSECUTIVE_READINGS: 3,
    /**
     * Minimum continuous overspeed duration (seconds) before a confirmed
     * violation.  Works together with MIN_CONSECUTIVE_READINGS — both
     * conditions must be met.
     */
    MIN_VIOLATION_DURATION_S: 10,
    /**
     * After a fine is generated for a vehicle, ignore further violations
     * for this many seconds (cooldown).
     */
    COOLDOWN_S: 120,
  },

  /* ── Fine calculation (DEMO policy — NOT legal advice) ─────────────────── */
  finePolicy: {
    /** Excess-speed tiers.  The first matching tier is used. */
    tiers: [
      { minExcess: 0,  maxExcess: 5,  amount: 0    },   // tolerance band — no fine
      { minExcess: 6,  maxExcess: 10, amount: 1000 },   // BDT
      { minExcess: 11, maxExcess: 20, amount: 1500 },
      { minExcess: 21, maxExcess: 30, amount: 2000 },
      { minExcess: 31, maxExcess: Infinity, amount: 3000 },
    ],
    /** Default amount if no tier matches (should never happen). */
    defaultAmount: 1000,
  },

  /* ── Telemetry storage ─────────────────────────────────────────────────── */
  telemetry: {
    /** How often the ESP32 is expected to report (seconds). */
    EXPECTED_INTERVAL_S: 5,
    /** Auto-delete raw telemetry records after this many days. */
    TTL_DAYS: 30,
    /** Maximum telemetry trail points returned for the live map polyline. */
    MAX_TRAIL_POINTS: 50,
  },

  /* ── Default speed limit when no zone matches ──────────────────────────── */
  DEFAULT_SPEED_LIMIT_KMH: 60,
};
