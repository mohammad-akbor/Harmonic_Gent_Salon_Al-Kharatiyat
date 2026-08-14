/**
 * Clear ALL revenue data + list every collection so nothing is missed.
 * Usage: node scripts/clear-revenue.js
 */
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}
const mongoose = require("mongoose");

const TO_CLEAR = [
  "bookings",
  "dailyentries",
  "sales",
  "expenses",
  "purchases",
  "tips",
  "deductions",
  "penalties",
  "salarypayments",
  "reviews",
];

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ Set MONGODB_URI in .env.local");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const cols = await db.listCollections().toArray();
  console.log("📦 Collections in DB:");
  cols.forEach((c) => console.log("   -", c.name));
  console.log("");

  let total = 0;
  for (const c of cols) {
    const name = c.name;
    const lower = name.toLowerCase();
    const should =
      TO_CLEAR.includes(lower) ||
      TO_CLEAR.includes(name) ||
      /booking|dailyentry|sale|expense|purchase|tip|deduction|penalty|salary/i.test(name);

    if (!should) continue;
    const r = await db.collection(name).deleteMany({});
    console.log("🗑️  cleared", name + ":", r.deletedCount);
    total += r.deletedCount;
  }

  console.log("\n✅ Total documents deleted:", total);
  console.log("   Finance should be ~0. Refresh /finance page.");
  console.log("   (Staff/Services/Products/Media/Users kept)");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
