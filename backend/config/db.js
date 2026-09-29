const mongoose = require("mongoose");

let isConnecting = false;

async function connectDB() {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("[db] MONGODB_URI is not set in environment!");
    return;
  }
  isConnecting = true;
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`[db] connected -> ${mongoose.connection.name}`);
  } catch (err) {
    console.error(`[db] connection failed: ${err.message}`);
    console.error("[db] Note: Make sure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access!");
    setTimeout(connectDB, 10000);
  } finally {
    isConnecting = false;
  }
}

mongoose.connection.on("disconnected", () => {
  console.log("[db] disconnected. Retrying in 5s...");
  setTimeout(connectDB, 5000);
});

module.exports = connectDB;

