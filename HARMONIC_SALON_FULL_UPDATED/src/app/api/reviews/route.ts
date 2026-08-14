import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Review } from "@/models/Review";
import { Staff } from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET ?staffId= — public visible reviews */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const staffId = new URL(req.url).searchParams.get("staffId");
    const q: Record<string, unknown> = { status: "Visible" };
    if (staffId) q.staffId = staffId;
    const list = await Review.find(q).sort({ createdAt: -1 }).limit(50).lean();
    const avg =
      list.length > 0 ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
    return NextResponse.json({ ok: true, reviews: list, average: Math.round(avg * 10) / 10, count: list.length });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/** POST — customer reviews staff after completed booking */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }
    const body = await req.json();
    const { staffId, rating, comment, bookingId, customerName } = body;
    if (!staffId || !rating) {
      return NextResponse.json({ ok: false, error: "staffId and rating (1-5) required" }, { status: 400 });
    }
    const r = Math.min(5, Math.max(1, Number(rating)));
    const staff = await Staff.findById(staffId);
    if (!staff) return NextResponse.json({ ok: false, error: "Staff not found" }, { status: 404 });

    const review = await Review.create({
      staffId,
      staffName: staff.name,
      customerId: (session.user as any).id,
      customerName: customerName || session.user.name || "Customer",
      bookingId: bookingId || undefined,
      rating: r,
      comment: comment || "",
      status: "Visible",
    });
    return NextResponse.json({ ok: true, review });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
