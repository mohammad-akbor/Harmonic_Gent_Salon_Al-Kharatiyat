import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Tip } from "@/models/Tip";
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
    const list = await Tip.find(q).sort({ date: -1 }).lean();
    return NextResponse.json({ ok: true, tips: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * POST tip.
 * Split between staff and salon.
 * amountToStaff → staff earnings (+)
 * amountToSalon → salon income (+)
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }
    const body = await req.json();
    const { amount, amountToStaff, amountToSalon, staffId, customerName, date, notes, bookingId, branchId } = body;
    if (amount == null || !date) {
      return NextResponse.json({ ok: false, error: "amount and date required" }, { status: 400 });
    }

    const total = Number(amount);
    let toStaff = amountToStaff != null ? Number(amountToStaff) : total;
    let toSalon = amountToSalon != null ? Number(amountToSalon) : 0;
    // normalize if only one provided
    if (amountToStaff == null && amountToSalon == null) {
      toStaff = total;
      toSalon = 0;
    } else if (amountToStaff != null && amountToSalon == null) {
      toSalon = total - toStaff;
    } else if (amountToSalon != null && amountToStaff == null) {
      toStaff = total - toSalon;
    }

    let staffName = "";
    if (staffId) {
      const staff = await Staff.findById(staffId);
      if (staff) staffName = staff.name;
    }

    const tip = await Tip.create({
      amount: total,
      amountToStaff: toStaff,
      amountToSalon: toSalon,
      staffId: staffId || undefined,
      staffName,
      customerName: customerName || "",
      date,
      branchId: branchId || undefined,
      notes: notes || "",
      bookingId: bookingId || undefined,
      createdBy: (session.user as any).id,
    });
    return NextResponse.json({ ok: true, tip });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
