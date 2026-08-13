import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Booking } from "@/models/Booking";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET customers tracking by area
 * Aggregates users role=customer + booking phones
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const area = new URL(req.url).searchParams.get("area");

    const users = await User.find({ role: "customer" }).select("-passwordHash").lean();
    const bookings = await Booking.find({}).select("customerName customerPhone customerEmail customerArea date status totalAmount").lean();

    // Build map by phone
    type Row = {
      name: string;
      phone: string;
      email: string;
      area: string;
      visits: number;
      lastVisit: string;
      totalSpend: number;
    };
    const map = new Map<string, Row>();

    for (const u of users) {
      const phone = (u.phone || u.email || u._id.toString()).toString();
      map.set(phone, {
        name: u.name,
        phone: u.phone || "",
        email: u.email || "",
        area: (u as any).area || "",
        visits: 0,
        lastVisit: "",
        totalSpend: 0,
      });
    }

    for (const b of bookings) {
      const phone = b.customerPhone || b.customerEmail || b.customerName;
      const prev = map.get(phone) || {
        name: b.customerName,
        phone: b.customerPhone || "",
        email: b.customerEmail || "",
        area: b.customerArea || "",
        visits: 0,
        lastVisit: "",
        totalSpend: 0,
      };
      prev.visits += 1;
      prev.totalSpend += b.totalAmount || b.price || 0;
      if (!prev.lastVisit || b.date > prev.lastVisit) prev.lastVisit = b.date;
      if (b.customerArea) prev.area = b.customerArea;
      if (b.customerName) prev.name = b.customerName;
      map.set(phone, prev);
    }

    let list = Array.from(map.values());
    if (area) {
      list = list.filter((c) => (c.area || "").toLowerCase().includes(area.toLowerCase()));
    }

    // Group by area
    const byArea: Record<string, { count: number; visits: number; spend: number }> = {};
    for (const c of list) {
      const a = c.area || "Unknown";
      if (!byArea[a]) byArea[a] = { count: 0, visits: 0, spend: 0 };
      byArea[a].count += 1;
      byArea[a].visits += c.visits;
      byArea[a].spend += c.totalSpend;
    }

    list.sort((a, b) => b.visits - a.visits);

    return NextResponse.json({
      ok: true,
      customers: list,
      byArea,
      totalCustomers: list.length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
