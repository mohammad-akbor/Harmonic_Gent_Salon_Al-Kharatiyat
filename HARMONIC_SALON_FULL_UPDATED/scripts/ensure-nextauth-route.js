/**
 * Mac zip sometimes breaks folder name [...nextauth]
 * Run: node scripts/ensure-nextauth-route.js
 * Or automatic via npm postinstall
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "src", "app", "api", "auth", "[...nextauth]");
const file = path.join(dir, "route.ts");

const content = `import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
`;

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log("Created folder: src/app/api/auth/[...nextauth]");
}
if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").length < 50) {
  fs.writeFileSync(file, content);
  console.log("Wrote route.ts for NextAuth");
} else {
  console.log("NextAuth route OK:", file);
}

// Remove empty conflict folders
const conflict = path.join(__dirname, "..", "src", "app", "(auth)");
if (fs.existsSync(conflict)) {
  fs.rmSync(conflict, { recursive: true, force: true });
  console.log("Removed conflict folder (auth)");
}
