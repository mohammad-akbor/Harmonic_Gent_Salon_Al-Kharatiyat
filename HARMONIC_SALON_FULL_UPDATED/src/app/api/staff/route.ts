import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Staff } from "@/models/Staff";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/staff
 *  - public / default: Active + bookable (Commission only — Fixed salary hidden from booking)
 *  - ?bookable=1: same (explicit for booking page)
 *  - ?all=1 + admin: every staff including Fixed & Inactive
 *  - Non-admin response strips commission % and salary amounts
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "1";
    const bookable = searchParams.get("bookable") === "1";
    const session = await getServerSession(authOptions);
    const role = session?.user ? (session.user as any).role : null;
    const isAdmin = role === "admin" || role === "manager";

    let q: Record<string, unknown> = { status: "Active" };

    if (all && isAdmin) {
      q = {}; // everything
    } else if (bookable || !isAdmin) {
      // Customer booking + public: only Active Commission staff
      // Fixed salary staff do NOT appear in appointment booking
      q = { status: "Active", salaryType: { $ne: "Fixed" } };
    } else if (role === "staff") {
      q = { status: "Active" };
    }

    const list = await Staff.find(q).sort({ name: 1 }).lean();

    // Hide commission / salary numbers from public & customers
    const safe = list.map((s: any) => {
      if (isAdmin) return s;
      return {
        _id: s._id,
        name: s.name,
        department: s.department,
        status: s.status,
        phone: s.phone,
        profilePicture: s.profilePicture || "",
        // no servicePercent, productPercent, fixedSalary
      };
    });

    return NextResponse.json({ ok: true, staff: safe });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/staff — ADMIN ONLY */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ ok: false, error: "Only Admin can create staff" }, { status: 403 });
    }
    const body = await req.json();
    const {
      name,
      department,
      phone,
      email,
      password,
      salaryType,
      fixedSalary,
      servicePercent,
      productPercent,
      status,
      monthlyRecovery,
      visaTicketCost,
      branchId,
    } = body;
    if (!name) {
      return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
    }

    const type = salaryType === "Fixed" ? "Fixed" : "Commission";
    const staff = await Staff.create({
      name: name.trim(),
      department: department || "Barber",
      phone: phone || "",
      email: (email || "").toLowerCase().trim(),
      salaryType: type,
      fixedSalary: type === "Fixed" ? Number(fixedSalary) || 0 : 0,
      servicePercent: type === "Commission" ? Number(servicePercent) || 0.4 : 0,
      productPercent: Number(productPercent) || 0.05,
      status: status === "Inactive" ? "Inactive" : "Active",
      monthlyRecovery: Number(monthlyRecovery) || 0,
      visaTicketCost: Number(visaTicketCost) || 0,
      branchId: branchId || undefined,
    });

    // Optional: create login so staff can sign in and see only their bookings/sales/tips
    let loginEmail = null;
    if (email && password && String(password).length >= 6) {
      const em = email.toLowerCase().trim();
      const exists = await User.findOne({ email: em });
      if (exists) {
        // link existing user if staff role
        if (exists.role === "staff") {
          exists.staffId = staff._id as any;
          await exists.save();
          staff.userId = exists._id as any;
          await staff.save();
          loginEmail = em;
        }
      } else {
        const passwordHash = await bcrypt.hash(String(password), 10);
        const user = await User.create({
          name: name.trim(),
          email: em,
          passwordHash,
          role: "staff",
          phone: phone || "",
          staffId: staff._id,
        });
        staff.userId = user._id as any;
        await staff.save();
        loginEmail = em;
      }
    }

    return NextResponse.json({
      ok: true,
      staff,
      login: loginEmail
        ? { email: loginEmail, note: "Staff can login with this email + password you set" }
        : { note: "No login created — add email+password (min 6) to allow staff login" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
