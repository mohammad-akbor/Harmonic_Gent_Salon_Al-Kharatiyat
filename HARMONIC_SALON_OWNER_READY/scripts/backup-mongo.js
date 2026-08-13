/**
 * Backup MongoDB to JSON files (run on your PC or cron)
 * Usage: node scripts/backup-mongo.js
 * Needs MONGODB_URI in .env.local
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  const outDir = path.join(__dirname, "..", "backups", new Date().toISOString().slice(0, 10));
  fs.mkdirSync(outDir, { recursive: true });

  for (const c of cols) {
    const name = c.name;
    const docs = await db.collection(name).find({}).toArray();
    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(docs, null, 2));
    console.log("✓", name, docs.length, "→", file);
  }
  console.log("Backup done:", outDir);
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
