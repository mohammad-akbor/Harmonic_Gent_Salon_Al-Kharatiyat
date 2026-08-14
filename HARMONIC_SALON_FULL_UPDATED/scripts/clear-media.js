/** Delete all gallery/story/video media. Usage: node scripts/clear-media.js */
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
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  for (const name of ["media", "medias"]) {
    try {
      const r = await db.collection(name).deleteMany({});
      console.log("cleared", name, r.deletedCount);
    } catch (_) {}
  }
  console.log("✅ Media cleared. Home gallery will be empty.");
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
