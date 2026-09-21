const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Vehicle = require("../models/Vehicle");
const GPSDevice = require("../models/GPSDevice");
const Fine = require("../models/Fine");
const Payment = require("../models/Payment");
const Admin = require("../models/Admin");
const SpeedZone = require("../models/SpeedZone");
const Telemetry = require("../models/Telemetry");
const { generatePaymentId } = require("../utils/generateIds");

const owners = [
  "Abdur Rahman", "Fatima Begum", "Karim Sheikh", "Nusrat Jahan", "Jashim Uddin",
  "Rina Akter", "Habibur Rahman", "Sultana Kamal", "Tanvir Ahmed", "Mahmudul Hasan",
  "Farhana Yasmin", "Anisur Rahman", "Shamima Nasrin", "Kazi Tariqul Islam", "Rezaul Karim",
  "Sadia Afrin", "Mehedi Hasan", "Nazmul Huda", "Afroza Parvin", "Ariful Haque",
  "Sharmin Sultana", "Ziaur Rahman", "Sumaiya Islam", "Kamrul Hassan", "Taslima Nasrin",
  "Monirul Islam", "Babar Ali", "Nasir Hossain", "Rubel Mia", "Sabina Yeasmin"
];

const vehiclesData = [
  // Cars
  { vehicleId: "VH-10294", registrationNumber: "DHAKA-METRO-GA-12-3456", ownerName: "Abdur Rahman", vehicleType: "Car", deviceId: "ESP32-DVC-45821" },
  { vehicleId: "VH-10297", registrationNumber: "DHAKA-METRO-GA-14-2210", ownerName: "Nusrat Jahan", vehicleType: "Car", deviceId: "ESP32-DVC-45824" },
  { vehicleId: "VH-10300", registrationNumber: "RAJSHAHI-GA-08-4520", ownerName: "Habibur Rahman", vehicleType: "Car", deviceId: "ESP32-DVC-45827" },
  { vehicleId: "VH-10302", registrationNumber: "DHAKA-METRO-BHA-25-1122", ownerName: "Tanvir Ahmed", vehicleType: "Car", deviceId: "ESP32-DVC-45829" },
  { vehicleId: "VH-10304", registrationNumber: "CHATTOGRAM-GA-15-4433", ownerName: "Farhana Yasmin", vehicleType: "Car", deviceId: "ESP32-DVC-45831" },
  { vehicleId: "VH-10309", registrationNumber: "DHAKA-METRO-GA-33-8899", ownerName: "Sadia Afrin", vehicleType: "Car", deviceId: "ESP32-DVC-45836" },
  { vehicleId: "VH-10313", registrationNumber: "KHULNA-GA-11-2045", ownerName: "Sharmin Sultana", vehicleType: "Car", deviceId: "ESP32-DVC-45840" },
  { vehicleId: "VH-10316", registrationNumber: "DHAKA-METRO-CHA-55-9012", ownerName: "Kamrul Hassan", vehicleType: "Car", deviceId: "ESP32-DVC-45843" },

  // Motorcycles
  { vehicleId: "VH-10295", registrationNumber: "DHAKA-METRO-HA-11-7788", ownerName: "Fatima Begum", vehicleType: "Motorcycle", deviceId: "ESP32-DVC-45822" },
  { vehicleId: "VH-10301", registrationNumber: "DHAKA-METRO-LA-21-9987", ownerName: "Sultana Kamal", vehicleType: "Motorcycle", deviceId: "ESP32-DVC-45828" },
  { vehicleId: "VH-10303", registrationNumber: "SYLHET-HA-17-3344", ownerName: "Mahmudul Hasan", vehicleType: "Motorcycle", deviceId: "ESP32-DVC-45830" },
  { vehicleId: "VH-10308", registrationNumber: "DHAKA-METRO-HA-42-1200", ownerName: "Rezaul Karim", vehicleType: "Motorcycle", deviceId: "ESP32-DVC-45835" },
  { vehicleId: "VH-10310", registrationNumber: "BARISHAL-HA-04-7711", ownerName: "Mehedi Hasan", vehicleType: "Motorcycle", deviceId: "ESP32-DVC-45837" },
  { vehicleId: "VH-10315", registrationNumber: "DHAKA-METRO-LA-39-6543", ownerName: "Sumaiya Islam", vehicleType: "Motorcycle", deviceId: "ESP32-DVC-45842" },
  { vehicleId: "VH-10320", registrationNumber: "MYMENSINGH-HA-09-3124", ownerName: "Rubel Mia", vehicleType: "Motorcycle", deviceId: "ESP32-DVC-45847" },

  // Buses
  { vehicleId: "VH-10296", registrationNumber: "CHATTOGRAM-BA-02-9081", ownerName: "Karim Sheikh", vehicleType: "Bus", deviceId: "ESP32-DVC-45823" },
  { vehicleId: "VH-10305", registrationNumber: "DHAKA-METRO-BA-14-7890", ownerName: "Anisur Rahman", vehicleType: "Bus", deviceId: "ESP32-DVC-45832" },
  { vehicleId: "VH-10311", registrationNumber: "RANGPUR-BA-03-6621", ownerName: "Nazmul Huda", vehicleType: "Bus", deviceId: "ESP32-DVC-45838" },
  { vehicleId: "VH-10317", registrationNumber: "DHAKA-METRO-BA-18-4321", ownerName: "Taslima Nasrin", vehicleType: "Bus", deviceId: "ESP32-DVC-45844" },
  { vehicleId: "VH-10321", registrationNumber: "CUMILLA-BA-05-9988", ownerName: "Sabina Yeasmin", vehicleType: "Bus", deviceId: "ESP32-DVC-45848" },

  // Trucks
  { vehicleId: "VH-10298", registrationNumber: "SYLHET-TA-05-6612", ownerName: "Jashim Uddin", vehicleType: "Truck", deviceId: "ESP32-DVC-45825" },
  { vehicleId: "VH-10306", registrationNumber: "DHAKA-METRO-TA-22-4512", ownerName: "Shamima Nasrin", vehicleType: "Truck", deviceId: "ESP32-DVC-45833" },
  { vehicleId: "VH-10312", registrationNumber: "GAZIPUR-TA-07-8843", ownerName: "Afroza Parvin", vehicleType: "Truck", deviceId: "ESP32-DVC-45839" },
  { vehicleId: "VH-10318", registrationNumber: "CHATTOGRAM-TA-12-7654", ownerName: "Monirul Islam", vehicleType: "Truck", deviceId: "ESP32-DVC-45845" },

  // CNGs
  { vehicleId: "VH-10299", registrationNumber: "DHAKA-METRO-THA-19-3301", ownerName: "Rina Akter", vehicleType: "CNG", deviceId: "ESP32-DVC-45826" },
  { vehicleId: "VH-10307", registrationNumber: "CHATTOGRAM-THA-11-9023", ownerName: "Kazi Tariqul Islam", vehicleType: "CNG", deviceId: "ESP32-DVC-45834" },
  { vehicleId: "VH-10314", registrationNumber: "DHAKA-METRO-THA-28-5432", ownerName: "Ziaur Rahman", vehicleType: "CNG", deviceId: "ESP32-DVC-45841" },
  { vehicleId: "VH-10319", registrationNumber: "NARAYANGANJ-THA-06-1199", ownerName: "Babar Ali", vehicleType: "CNG", deviceId: "ESP32-DVC-45846" },
];

const { brtaGuideline2024 } = require("../config/efiningConfig");

const highwayLocations = [
  {
    description: "Dhaka-Mymensingh Highway (N3), Trishal Section",
    roadCode: "N3",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 24.5822,
    longitude: 90.3958,
    radius: 3500,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Trishal Bazar Urban Zone, Mymensingh",
    roadCode: "N3-BZR",
    roadType: "Urban Road / Bazar Area",
    brtaCategory: "URBAN_ROAD",
    latitude: 24.5805,
    longitude: 90.3965,
    radius: 1200,
    defaultLimit: 40,
    limitsByVehicle: brtaGuideline2024.categories.URBAN_ROAD.limits,
  },
  {
    description: "JKKNIU Campus & School Zone, Trishal",
    roadCode: "JKKNIU",
    roadType: "Vulnerable / Educational Institution Zone",
    brtaCategory: "VULNERABLE_ZONE",
    latitude: 24.5855,
    longitude: 90.3850,
    radius: 1500,
    defaultLimit: 30,
    limitsByVehicle: brtaGuideline2024.categories.VULNERABLE_ZONE.limits,
  },
  {
    description: "Dhaka-Mymensingh Highway (N3), Bhaluka",
    roadCode: "N3",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 24.3750,
    longitude: 90.3780,
    radius: 3000,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Padma Bridge Expressway (N8), Munshiganj",
    roadCode: "N8",
    roadType: "Expressway",
    brtaCategory: "EXPRESSWAY",
    latitude: 23.4721,
    longitude: 90.2814,
    radius: 4000,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.EXPRESSWAY.limits,
  },
  {
    description: "Dhaka-Mymensingh Highway, Tongi Bypass",
    roadCode: "N3",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 23.9012,
    longitude: 90.4023,
    radius: 2500,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Dhaka-Chattogram Highway (N1), Kanchpur Bridge",
    roadCode: "N1",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 23.7089,
    longitude: 90.5234,
    radius: 2500,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Airport Road, Kurmitola, Dhaka",
    roadCode: "N3-URB",
    roadType: "Urban Road",
    brtaCategory: "URBAN_ROAD",
    latitude: 23.8241,
    longitude: 90.4128,
    radius: 2000,
    defaultLimit: 40,
    limitsByVehicle: brtaGuideline2024.categories.URBAN_ROAD.limits,
  },
  {
    description: "Mayor Hanif Flyover, Jatrabari",
    roadCode: "FLY-01",
    roadType: "Urban Elevated Expressway",
    brtaCategory: "URBAN_ROAD",
    latitude: 23.7125,
    longitude: 90.4352,
    radius: 2000,
    defaultLimit: 50,
    limitsByVehicle: brtaGuideline2024.categories.URBAN_ROAD.limits,
  },
  {
    description: "Bangabandhu Tunnel Expressway, Anwara",
    roadCode: "TUN-01",
    roadType: "Expressway",
    brtaCategory: "EXPRESSWAY",
    latitude: 22.2412,
    longitude: 91.8021,
    radius: 3000,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.EXPRESSWAY.limits,
  },
  {
    description: "N1 Highway, Cumilla Bypass",
    roadCode: "N1",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 23.4612,
    longitude: 91.1823,
    radius: 2500,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Dhaka-Aricha Highway (N5), Savar Overpass",
    roadCode: "N5",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 23.8542,
    longitude: 90.2612,
    radius: 2500,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Sylhet-Dhaka Highway (N2), Osmani Nagar",
    roadCode: "N2",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 24.7821,
    longitude: 91.7342,
    radius: 2500,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Rajshahi Bypass Road (N6), Baneswar",
    roadCode: "N6",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 24.3721,
    longitude: 88.6012,
    radius: 2500,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Hatirjheel Expressway, Dhaka",
    roadCode: "URB-HJ",
    roadType: "Urban Road",
    brtaCategory: "URBAN_ROAD",
    latitude: 23.7712,
    longitude: 90.4145,
    radius: 1500,
    defaultLimit: 40,
    limitsByVehicle: brtaGuideline2024.categories.URBAN_ROAD.limits,
  },
  {
    description: "Khulna-Jashore Highway (N7), Phultala",
    roadCode: "N7",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 22.9734,
    longitude: 89.4721,
    radius: 2500,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Bangabandhu Bridge Approach Road (N4), Sirajganj",
    roadCode: "N4",
    roadType: "National Highway",
    brtaCategory: "NATIONAL_HIGHWAY",
    latitude: 24.3912,
    longitude: 89.7541,
    radius: 3000,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.NATIONAL_HIGHWAY.limits,
  },
  {
    description: "Dhaka Elevated Expressway, Tejgaon",
    roadCode: "DEX-01",
    roadType: "Expressway",
    brtaCategory: "EXPRESSWAY",
    latitude: 23.7612,
    longitude: 90.3921,
    radius: 2000,
    defaultLimit: 80,
    limitsByVehicle: brtaGuideline2024.categories.EXPRESSWAY.limits,
  },
];

function daysAgo(n, hoursOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hoursOffset);
  return d;
}

function calculateFine(excessSpeed) {
  if (excessSpeed <= 15) return 1500;
  if (excessSpeed <= 25) return 2500;
  if (excessSpeed <= 35) return 3500;
  return 5000;
}

async function run() {
  await connectDB();

  console.log("Clearing existing collections...");
  await Promise.all([
    Vehicle.deleteMany({}),
    GPSDevice.deleteMany({}),
    Fine.deleteMany({}),
    Payment.deleteMany({}),
    SpeedZone.deleteMany({}),
    Telemetry.deleteMany({}),
  ]);

  console.log(`Inserting ${vehiclesData.length} vehicles...`);
  await Vehicle.insertMany(vehiclesData);

  console.log("Inserting GPS Devices...");
  const devices = vehiclesData.map((v, i) => ({
    deviceId: v.deviceId,
    vehicleId: v.vehicleId,
    status: i % 7 === 0 ? "INACTIVE" : "ACTIVE",
    lastSeen: daysAgo(0, i * 2),
  }));
  await GPSDevice.insertMany(devices);

  // ── Speed Zones — geofenced areas with speed limits ───────────────────
  console.log("Inserting Speed Zones...");
  const speedZones = highwayLocations.map((loc, i) => ({
    zoneId: `SZ-${String(i + 1).padStart(3, "0")}`,
    name: loc.description,
    roadCode: loc.roadCode || "N3",
    roadType: loc.roadType || "National Highway",
    brtaCategory: loc.brtaCategory || "nationalHighway",
    center: { latitude: loc.latitude, longitude: loc.longitude },
    radius: loc.radius || 2000,
    speedLimit: loc.defaultLimit,
    limitsByVehicle: loc.limitsByVehicle || {
      Car: loc.defaultLimit,
      Bus: Math.max(loc.defaultLimit - 10, 40),
      Truck: Math.max(loc.defaultLimit - 20, 40),
      Motorcycle: Math.min(loc.defaultLimit, 50),
      CNG: 40,
    },
    vehicleType: "All",
    active: true,
  }));
  await SpeedZone.insertMany(speedZones);

  console.log("Generating realistic traffic fines...");
  const fines = [];

  // Generate 42 varied fines across past 25 days
  for (let i = 0; i < 42; i++) {
    const v = vehiclesData[i % vehiclesData.length];
    const loc = highwayLocations[i % highwayLocations.length];
    const allowed = loc.defaultLimit;
    
    // Varying degrees of excess speed
    const overspeedOffsets = [12, 18, 24, 31, 42, 14, 27, 36, 16, 22, 29, 38];
    const excess = overspeedOffsets[i % overspeedOffsets.length];
    const recorded = allowed + excess;
    const fineAmount = calculateFine(excess);

    // Status: 60% UNPAID, 35% PAID, 5% CANCELLED
    let status = "UNPAID";
    if (i % 3 === 0) {
      status = "PAID";
    } else if (i === 19 || i === 37) {
      status = "CANCELLED";
    }

    const fineDate = daysAgo(Math.floor(i / 2), (i % 24));

    fines.push({
      fineId: `FIN-202609${String(i + 1).padStart(2, "0")}-${String(100 + i)}`,
      vehicleId: v.vehicleId,
      deviceId: v.deviceId,
      ownerName: v.ownerName,
      registrationNumber: v.registrationNumber,
      violationType: "Overspeeding",
      recordedSpeed: recorded,
      allowedSpeed: allowed,
      location: {
        latitude: loc.latitude + ((i % 5) - 2) * 0.003,
        longitude: loc.longitude + ((i % 5) - 2) * 0.003,
        description: loc.description,
      },
      violationDate: fineDate,
      fineAmount: fineAmount,
      status: status,
    });
  }

  const createdFines = await Fine.insertMany(fines);

  // Generate corresponding payments for PAID fines
  const paidFines = createdFines.filter((f) => f.status === "PAID");
  console.log(`Generating payment records for ${paidFines.length} paid fines...`);
  
  const payments = paidFines.map((f, idx) => ({
    paymentId: generatePaymentId(),
    fineId: f.fineId,
    amount: f.fineAmount,
    stripeSessionId: `cs_test_${f.fineId.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    stripePaymentIntentId: `pi_test_${f.fineId.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    status: "SUCCEEDED",
    paidAt: new Date(new Date(f.violationDate).getTime() + (idx + 1) * 3600000 * 12),
  }));

  await Payment.insertMany(payments);

  // Super Admin account setup
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "superadmin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await Admin.findOneAndUpdate(
    { username: adminUsername },
    { username: adminUsername, passwordHash, role: "SUPER_ADMIN" },
    { upsert: true }
  );

  const unpaidCount = fines.filter((f) => f.status === "UNPAID").length;
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  console.log("\n==========================================");
  console.log(" DUMMY DATA SEEDING COMPLETE");
  console.log("==========================================");
  console.log(`✓ Vehicles: ${vehiclesData.length}`);
  console.log(`✓ GPS Devices: ${devices.length}`);
  console.log(`✓ Speed Zones: ${speedZones.length}`);
  console.log(`✓ Total Fines: ${fines.length}`);
  console.log(`   - Unpaid (Public Portal): ${unpaidCount}`);
  console.log(`   - Paid (Completed Payments): ${paidFines.length}`);
  console.log(`   - Cancelled: ${fines.length - unpaidCount - paidFines.length}`);
  console.log(`✓ Total Collected Revenue: BDT ${totalRevenue.toLocaleString()}`);
  console.log(`✓ Super Admin: "${adminUsername}"`);
  console.log("==========================================\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
