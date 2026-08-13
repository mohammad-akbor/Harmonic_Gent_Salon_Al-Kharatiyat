import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

/** GET /api/users — Admin only */
export async function GET() {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 }).lean();
    return NextResponse.json({ ok: true, users });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/users — Admin create user */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const { name, email, password, role, phone } = body;
    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: "Name, email, password required" }, { status: 400 });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return NextResponse.json({ ok: false, error: "Email exists" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: ["admin", "manager", "staff", "customer"].includes(role) ? role : "customer",
      phone: phone || "",
    });
    const out = user.toObject();
    delete (out as any).passwordHash;
    return NextResponse.json({ ok: true, user: out });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
