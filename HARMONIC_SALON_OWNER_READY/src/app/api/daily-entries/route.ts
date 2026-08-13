import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyEntry } from "@/models/DailyEntry";
import { Staff } from "@/models/Staff";
import { calcRowEarnings } from "@/lib/finance";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const staffId = searchParams.get("staffId");
    const q: Record<string, unknown> = {};
    if (date) q.date = date;
    if (from && to) q.date = { $gte: from, $lte: to };
    if (staffId) q.staffId = staffId;
    const list = await DailyEntry.find(q).sort({ date: -1, staffName: 1 }).lean();
    return NextResponse.json({ ok: true, entries: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * POST / PUT upsert one daily entry (one staff one day)
 * Body: date, staffId, totalClients, serviceSales, productSales, tips, cash, card, online, notes
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager", "staff"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }
    const body = await req.json();
    const { date, staffId, totalClients, serviceSales, productSales, tips, cash, card, online, notes, branchId, paymentMethod } = body;
    if (!date || !staffId) {
      return NextResponse.json({ ok: false, error: "date and staffId required" }, { status: 400 });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });

    const svcSales = Number(serviceSales) || 0;
    const prodSales = Number(productSales) || 0;
    const tipsAmt = Number(tips) || 0;
    const sp = staff.servicePercent ?? 0.4;
    const pp = staff.productPercent ?? 0.05;
    const staffEarnings = calcRowEarnings(svcSales, prodSales, tipsAmt, sp, pp);

    const entry = await DailyEntry.findOneAndUpdate(
      { date, staffId },
      {
        date,
        staffId,
        staffName: staff.name,
        branchId: branchId || staff.branchId || undefined,
        totalClients: Number(totalClients) || 0,
        serviceSales: svcSales,
        productSales: prodSales,
        tips: tipsAmt,
        cash: Number(cash) || 0,
        card: Number(card) || 0,
        online: Number(online) || 0,
        servicePercent: sp,
        productPercent: pp,
        staffEarnings,
        paymentMethod: paymentMethod || "Mixed",
        notes: notes || "",
        createdBy: (session.user as any).id,
      },
      { upsert: true, new: true }
    );

    const salesTotal = svcSales + prodSales;
    const payTotal = (Number(cash) || 0) + (Number(card) || 0) + (Number(online) || 0);
    const match = Math.abs(salesTotal - payTotal) <= 1;

    return NextResponse.json({
      ok: true,
      entry,
      check: { salesTotal, payTotal, match: match ? "OK" : `DIFF ${payTotal - salesTotal}` },
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await DailyEntry.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
