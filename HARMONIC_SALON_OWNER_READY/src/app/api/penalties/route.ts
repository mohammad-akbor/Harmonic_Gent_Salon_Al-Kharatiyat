import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Penalty } from "@/models/Penalty";
import { Staff } from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const staffId = searchParams.get("staffId");
    const q: Record<string, unknown> = {};
    if (from && to) q.date = { $gte: from, $lte: to };
    if (staffId) q.staffId = staffId;
    const list = await Penalty.find(q).sort({ date: -1 }).lean();
    return NextResponse.json({ ok: true, penalties: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * POST penalty.
 * Amount is DEDUCTED from staff net earnings
 * AND ADDED to salon profit (penaltyIncome).
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin/Manager only" }, { status: 403 });
    }
    const body = await req.json();
    const { staffId, amount, reason, date, notes, branchId } = body;
    if (!staffId || amount == null || !reason || !date) {
      return NextResponse.json({ ok: false, error: "staffId, amount, reason, date required" }, { status: 400 });
    }
    const staff = await Staff.findById(staffId);
    if (!staff) return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });

    const penalty = await Penalty.create({
      staffId,
      staffName: staff.name,
      amount: Number(amount),
      reason: reason.trim(),
      date,
      branchId: branchId || undefined,
      notes: notes || "",
      createdBy: (session.user as any).id,
    });
    return NextResponse.json({ ok: true, penalty });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
