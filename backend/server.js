require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { asyncHandler } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { stripeWebhook } = require("./controllers/paymentController");

const fineRoutes = require("./routes/fineRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const telemetryRoutes = require("./routes/telemetryRoutes");
const speedZoneRoutes = require("./routes/speedZoneRoutes");
const { sseHandler } = require("./services/sseService");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// The Stripe webhook needs the RAW request body to verify the signature,
// so it's mounted BEFORE express.json() and given its own raw parser.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  asyncHandler(stripeWebhook)
);

app.use(express.json({ limit: "200kb" }));
app.use(mongoSanitize());

const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
const paymentLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
// ESP32 devices post telemetry every ~5s → ~12/min per device.
// Higher limit accommodates multiple devices + simulation requests.
const telemetryLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });

app.use("/api", publicLimiter, fineRoutes);
app.use("/api", publicLimiter, speedZoneRoutes);
app.use("/api", telemetryLimiter, telemetryRoutes);
app.use("/api/payments", paymentLimiter, paymentRoutes);
app.use("/admin/api", adminRoutes);

// Server-Sent Events endpoint for real-time frontend updates.
// Mounted outside rate limiters — SSE is a long-lived connection.
app.get("/api/events", sseHandler);

app.get("/api/health", async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  let counts = { fines: 0, vehicles: 0, payments: 0 };
  if (isConnected) {
    try {
      const Fine = require("./models/Fine");
      const Vehicle = require("./models/Vehicle");
      const Payment = require("./models/Payment");
      const [fines, vehicles, payments] = await Promise.all([
        Fine.countDocuments(),
        Vehicle.countDocuments(),
        Payment.countDocuments(),
      ]);
      counts = { fines, vehicles, payments };
    } catch (e) {}
  }
  res.json({
    success: true,
    status: "ok",
    database: {
      connected: isConnected,
      name: mongoose.connection.name,
      host: mongoose.connection.host,
    },
    counts,
    timestamp: new Date().toISOString(),
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
