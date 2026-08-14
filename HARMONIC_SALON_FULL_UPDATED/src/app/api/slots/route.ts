import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";

/**
 * GET /api/slots?staffId=&date=YYYY-MM-DD
 * Returns available time slots (slot lock aware)
 */
const ALL_SLOTS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00",
];

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    const date = searchParams.get("date");

    if (!staffId || !date) {
      return NextResponse.json({ ok: false, error: "staffId and date required" }, { status: 400 });
    }

    // Locked = confirmed bookings only
    const taken = await Booking.find({
      staffId,
      date,
      status: "confirmed",
    }).select("startTime");

    const takenSet = new Set(taken.map((b) => b.startTime));
    const slots = ALL_SLOTS.map((t) => ({
      time: t,
      available: !takenSet.has(t),
    }));

    return NextResponse.json({ ok: true, date, staffId, slots });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
