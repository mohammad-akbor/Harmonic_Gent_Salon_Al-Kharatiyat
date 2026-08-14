import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Deduction } from "@/models/Deduction";
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
    const list = await Deduction.find(q).sort({ date: -1 }).lean();
    return NextResponse.json({ ok: true, deductions: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin/Manager only" }, { status: 403 });
    }
    const body = await req.json();
    const { staffId, type, amount, reason, date, notes, branchId } = body;
    if (!staffId || !type || amount == null || !reason || !date) {
      return NextResponse.json({ ok: false, error: "staffId, type, amount, reason, date required" }, { status: 400 });
    }
    const allowed = ["Penalty", "Visa", "Advance", "Other"];
    if (!allowed.includes(type)) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }
    const staff = await Staff.findById(staffId);
    if (!staff) return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });

    const monthKey = date.slice(0, 7); // YYYY-MM
    const deduction = await Deduction.create({
      date,
      staffId,
      staffName: staff.name,
      type,
      amount: Number(amount),
      reason: reason.trim(),
      monthKey,
      branchId: branchId || undefined,
      notes: notes || "",
      createdBy: (session.user as any).id,
    });

    // If Visa, reduce remaining balance on staff
    if (type === "Visa" && staff.remainingBalance > 0) {
      staff.remainingBalance = Math.max(0, (staff.remainingBalance || 0) - Number(amount));
      await staff.save();
    }

    return NextResponse.json({ ok: true, deduction });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
