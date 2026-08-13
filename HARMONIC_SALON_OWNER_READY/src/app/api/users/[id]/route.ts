import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") return null;
  return session;
}

/** PATCH — update user (Admin) */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.role !== undefined && ["admin", "manager", "staff", "customer"].includes(body.role)) {
      update.role = body.role;
    }
    if (body.password && body.password.length >= 6) {
      update.passwordHash = await bcrypt.hash(body.password, 10);
    }
    const user = await User.findByIdAndUpdate(params.id, update, { new: true }).select("-passwordHash");
    if (!user) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE — remove user (Admin) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    await connectDB();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
