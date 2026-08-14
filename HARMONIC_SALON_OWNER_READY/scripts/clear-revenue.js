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

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI missing in .env.local");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  console.log("Collections:", cols.map((c) => c.name).join(", "));
  let total = 0;
  for (const c of cols) {
    if (/booking|dailyentry|sale|expense|purchase|tip|deduction|penalty|salary|review/i.test(c.name)) {
      const r = await db.collection(c.name).deleteMany({});
      console.log("cleared", c.name, "→", r.deletedCount);
      total += r.deletedCount;
    }
  }
  console.log("DONE total:", total);
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});