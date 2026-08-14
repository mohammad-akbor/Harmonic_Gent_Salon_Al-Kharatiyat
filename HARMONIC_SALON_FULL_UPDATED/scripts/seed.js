/**
 * Seed ONLY admin user — no demo staff/services/products
 * Run: npm run seed
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
}

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Set MONGODB_URI in .env.local first");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: String,
    phone: String,
    staffId: mongoose.Schema.Types.ObjectId,
    area: String,
  });

  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const email = process.env.ADMIN_EMAIL || "admin@harmonicsalon.com";
  const password = process.env.ADMIN_PASSWORD || "ChangeThisPassword123";
  const name = process.env.ADMIN_NAME || "Salon Admin";

  const hash = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate(
    { email },
    { name, email, passwordHash: hash, role: "admin" },
    { upsert: true }
  );
  console.log("✅ Admin only (no demo data):");
  console.log("   Email:", email);
  console.log("   Password:", password);
  console.log("Add Staff / Services / Products yourself from Admin panel.");

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
