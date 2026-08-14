import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Attendance } from "@/models/Attendance";
import { Staff } from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET ?date=&staffId=&from=&to= */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const staffId = searchParams.get("staffId");
    const q: Record<string, unknown> = {};
    if (date) q.date = date;
    if (from && to) q.date = { $gte: from, $lte: to };
    if (staffId) q.staffId = staffId;
    // staff only own
    if ((session.user as any).role === "staff" && (session.user as any).staffId) {
      q.staffId = (session.user as any).staffId;
    }
    const list = await Attendance.find(q).sort({ checkInAt: -1 }).lean();
    return NextResponse.json({ ok: true, attendance: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * POST body:
 *  { action: "check-in", staffId? }
 *  { action: "check-out", staffId? }
 *  { action: "manual", staffId, date, checkInAt, checkOutAt?, notes } — admin
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    const body = await req.json();
    const action = body.action || "check-in";
    let staffId = body.staffId || (session.user as any).staffId;

    if (role === "staff") {
      staffId = (session.user as any).staffId;
      if (!staffId) {
        return NextResponse.json({ ok: false, error: "Staff profile not linked" }, { status: 400 });
      }
    }

    if (!staffId) {
      return NextResponse.json({ ok: false, error: "staffId required" }, { status: 400 });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });

    const today = new Date().toISOString().slice(0, 10);

    if (action === "check-in") {
      const open = await Attendance.findOne({ staffId, status: "Open" });
      if (open) {
        return NextResponse.json({ ok: false, error: "Already checked in — check out first", attendance: open }, { status: 400 });
      }
      const row = await Attendance.create({
        staffId,
        staffName: staff.name,
        date: today,
        checkInAt: new Date(),
        status: "Open",
        markedBy: (session.user as any).id,
      });
      return NextResponse.json({ ok: true, attendance: row, message: "Checked in" });
    }

    if (action === "check-out") {
      const open = await Attendance.findOne({ staffId, status: "Open" }).sort({ checkInAt: -1 });
      if (!open) {
        return NextResponse.json({ ok: false, error: "No open check-in found" }, { status: 400 });
      }
      const out = new Date();
      const hours = Math.round(((out.getTime() - open.checkInAt.getTime()) / 3600000) * 100) / 100;
      open.checkOutAt = out;
      open.hoursWorked = hours;
      open.status = "Closed";
      await open.save();
      return NextResponse.json({ ok: true, attendance: open, message: `Checked out · ${hours}h` });
    }

    if (action === "manual" && ["admin", "manager"].includes(role)) {
      const date = body.date || today;
      const checkInAt = body.checkInAt ? new Date(body.checkInAt) : new Date();
      const checkOutAt = body.checkOutAt ? new Date(body.checkOutAt) : undefined;
      let hours = 0;
      let st = "Open";
      if (checkOutAt) {
        hours = Math.round(((checkOutAt.getTime() - checkInAt.getTime()) / 3600000) * 100) / 100;
        st = "Closed";
      }
      const row = await Attendance.create({
        staffId,
        staffName: staff.name,
        date,
        checkInAt,
        checkOutAt,
        hoursWorked: hours,
        status: st,
        notes: body.notes || "",
        markedBy: (session.user as any).id,
      });
      return NextResponse.json({ ok: true, attendance: row });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
