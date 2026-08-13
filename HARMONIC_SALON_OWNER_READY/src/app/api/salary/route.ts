import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SalaryPayment } from "@/models/SalaryPayment";
import { Staff } from "@/models/Staff";
import { calcStaffEarnings } from "@/lib/finance";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const periodKey = searchParams.get("periodKey"); // YYYY-MM
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const staffId = searchParams.get("staffId");
    const q: Record<string, unknown> = {};
    if (periodKey) q.periodKey = periodKey;
    if (from && to) q.date = { $gte: from, $lte: to };
    if (staffId) q.staffId = staffId;
    const list = await SalaryPayment.find(q).sort({ staffName: 1 }).lean();
    return NextResponse.json({ ok: true, payments: list, locked: list.length > 0 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * POST body modes:
 *  { mode: "pay-one", staffId, periodStart, periodEnd, date? }
 *  { mode: "pay-all", periodStart, periodEnd, date? }  ← Pay done for whole month
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin/Manager only" }, { status: 403 });
    }

    const body = await req.json();
    const mode = body.mode || "pay-one";
    const periodStart = body.periodStart;
    const periodEnd = body.periodEnd;
    const date = body.date || new Date().toISOString().slice(0, 10);

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ ok: false, error: "periodStart and periodEnd required" }, { status: 400 });
    }

    const periodKey = periodStart.slice(0, 7); // YYYY-MM

    async function payOne(staffId: string) {
      const existing = await SalaryPayment.findOne({ staffId, periodKey });
      if (existing) {
        return { skipped: true, staffId, reason: "Already paid/locked for this month" };
      }

      const staff = await Staff.findById(staffId);
      if (!staff || staff.status !== "Active") {
        return { skipped: true, staffId, reason: "Staff not active" };
      }

      const earnings = await calcStaffEarnings(staffId, periodStart, periodEnd);
      if (!earnings) return { skipped: true, staffId, reason: "No earnings calc" };

      const payment = await SalaryPayment.create({
        staffId,
        staffName: staff.name,
        periodStart,
        periodEnd,
        periodKey,
        fixedAmount: earnings.fixedAmount,
        commissionAmount: earnings.serviceCommission + earnings.productCommission,
        serviceCommission: earnings.serviceCommission,
        productCommission: earnings.productCommission,
        tipsAmount: earnings.tipsAmount,
        penaltyDeduction: earnings.penaltyAmount,
        visaDeduction: earnings.visaAmount,
        otherDeduction: (earnings.advanceAmount || 0) + (earnings.otherCutAmount || 0),
        totalCuts: earnings.totalCuts,
        grossAmount: earnings.grossEarnings,
        netPaid: earnings.netEarnings,
        date,
        locked: true,
        notes: body.notes || "Pay done",
        createdBy: (session!.user as any).id,
      });

      return { skipped: false, payment, earnings };
    }

    if (mode === "pay-all") {
      const staffList = await Staff.find({ status: "Active" }).lean();
      const results = [];
      for (const s of staffList) {
        results.push(await payOne(s._id.toString()));
      }
      const paid = results.filter((r) => !r.skipped).length;
      const skipped = results.filter((r) => r.skipped).length;
      return NextResponse.json({
        ok: true,
        mode: "pay-all",
        periodKey,
        paid,
        skipped,
        results,
        message: `Pay done: ${paid} staff paid, ${skipped} skipped (already locked or inactive)`,
      });
    }

    // pay-one
    if (!body.staffId) {
      return NextResponse.json({ ok: false, error: "staffId required" }, { status: 400 });
    }
    const result = await payOne(body.staffId);
    if (result.skipped) {
      return NextResponse.json({ ok: false, error: result.reason }, { status: 409 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    // duplicate key
    if (e && typeof e === "object" && "code" in e && (e as any).code === 11000) {
      return NextResponse.json({ ok: false, error: "Already paid for this period (locked)" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
