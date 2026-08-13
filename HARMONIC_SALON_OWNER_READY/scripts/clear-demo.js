/**
 * Empty Staff + Services + Products so you can add everything yourself.
 * Keeps: Admin user, Media (videos/images), Bookings (if any real ones).
 * Usage: npm run clear-demo
 */
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}
const mongoose = require("mongoose");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("Set MONGODB_URI in .env.local");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const staff = await db.collection("staffs").deleteMany({});
  const services = await db.collection("services").deleteMany({});
  const products = await db.collection("products").deleteMany({});

  // Also clear common alternate collection names if any
  try { await db.collection("staff").deleteMany({}); } catch (_) {}
  try { await db.collection("service").deleteMany({}); } catch (_) {}
  try { await db.collection("product").deleteMany({}); } catch (_) {}

  console.log("✅ System emptied for you to add data:");
  console.log("   Staff deleted:", staff.deletedCount);
  console.log("   Services deleted:", services.deletedCount);
  console.log("   Products deleted:", products.deletedCount);
  console.log("   Admin user + Media kept.");
  console.log("Now run: npm run seed   (creates/updates admin only)");
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
