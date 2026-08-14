import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Staff } from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") return null;
  return session;
}

/** PATCH — update staff (Admin only) — activate/deactivate etc */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Only Admin can update staff" }, { status: 403 });
    }
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    ["name", "department", "phone", "email", "salaryType", "status", "branchId"].forEach((k) => {
      if (body[k] !== undefined) update[k] = body[k];
    });
    if (body.fixedSalary !== undefined) update.fixedSalary = Number(body.fixedSalary);
    if (body.servicePercent !== undefined) update.servicePercent = Number(body.servicePercent);
    if (body.productPercent !== undefined) update.productPercent = Number(body.productPercent);

    const staff = await Staff.findByIdAndUpdate(params.id, update, { new: true });
    if (!staff) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, staff });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE — permanently remove staff (Admin only) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Only Admin can delete staff" }, { status: 403 });
    }
    await connectDB();
    const staff = await Staff.findByIdAndDelete(params.id);
    if (!staff) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, message: "Staff deleted" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
