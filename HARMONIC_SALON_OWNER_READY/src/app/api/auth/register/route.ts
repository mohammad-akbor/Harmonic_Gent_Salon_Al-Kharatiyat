import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Staff } from "@/models/Staff";

/**
 * POST /api/auth/register
 * Body: { name, email, password, phone, role: "customer" | "staff" }
 * Staff registration creates User + optional Staff profile (status Inactive until admin activates)
 * Only admin can create other admins (not allowed here)
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, email, password, phone, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: "Name, email and password required" }, { status: 400 });
    }

    const allowedRoles = ["customer", "staff"];
    const userRole = allowedRoles.includes(role) ? role : "customer";

    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return NextResponse.json({ ok: false, error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let staffId = null;
    if (userRole === "staff") {
      // Create staff profile as Inactive — admin must activate
      const staffDoc = await Staff.create({
        name: name.trim(),
        phone: phone || "",
        email: email.toLowerCase().trim(),
        department: "Barber",
        status: "Inactive",
        salaryType: "Commission",
        servicePercent: 0.4,
        productPercent: 0.05,
      });
      staffId = staffDoc._id;
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: userRole,
      phone: phone || "",
      staffId,
    });

    if (staffId) {
      await Staff.findByIdAndUpdate(staffId, { userId: user._id });
    }

    return NextResponse.json({
      ok: true,
      message:
        userRole === "staff"
          ? "Staff account created. Wait for Admin to activate your profile."
          : "Customer account created. You can now login and book.",
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
