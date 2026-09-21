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

  /* ── BRTA Motor Vehicle Speed Limit Guideline 2024 ─────────────────────── */
  brtaGuideline2024: {
    reference: "BRTA Motor Vehicle Speed Limit Guideline 2024 (মোটরযান গতিসীমা নির্দেশিকা ২০২৪)",
    categories: {
      EXPRESSWAY: {
        code: "EXPRESSWAY",
        name: "Expressway (e.g. N8 Bangabandhu Expressway)",
        limits: { Car: 80, Microbus: 80, SUV: 80, Bus: 80, Truck: 60, Motorcycle: 60, CNG: 0, All: 80 },
      },
      NATIONAL_HIGHWAY: {
        code: "NATIONAL_HIGHWAY",
        name: "National Highway (e.g. N3 Dhaka-Mymensingh Highway)",
        limits: { Car: 80, Microbus: 80, SUV: 80, Bus: 70, Truck: 60, Motorcycle: 50, CNG: 30, All: 80 },
      },
      REGIONAL_HIGHWAY: {
        code: "REGIONAL_HIGHWAY",
        name: "Regional Highway (আঞ্চলিক মহাসড়ক)",
        limits: { Car: 70, Microbus: 70, SUV: 70, Bus: 60, Truck: 50, Motorcycle: 50, CNG: 30, All: 70 },
      },
      DISTRICT_ROAD: {
        code: "DISTRICT_ROAD",
        name: "District / Zilla Road (জেলা সড়ক)",
        limits: { Car: 60, Microbus: 60, SUV: 60, Bus: 50, Truck: 40, Motorcycle: 40, CNG: 30, All: 60 },
      },
      URBAN_ROAD: {
        code: "URBAN_ROAD",
        name: "City Corporation / Municipality / Urban (পৌরসভা / সিটি কর্পোরেশন)",
        limits: { Car: 40, Microbus: 40, SUV: 40, Bus: 40, Truck: 30, Motorcycle: 30, CNG: 30, All: 40 },
      },
      VULNERABLE_ZONE: {
        code: "VULNERABLE_ZONE",
        name: "School / College / University / Hospital / Market Zone",
        limits: { Car: 30, Microbus: 30, SUV: 30, Bus: 30, Truck: 30, Motorcycle: 30, CNG: 20, All: 30 },
      },
    },
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
