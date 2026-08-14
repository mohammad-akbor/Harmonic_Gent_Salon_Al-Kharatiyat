import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Booking } from "@/models/Booking";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
    return null;
  }
  return session;
}

/**
 * GET customers tracking by area
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const area = new URL(req.url).searchParams.get("area");
    const users = await User.find({ role: "customer" }).select("-passwordHash").lean();
    const bookings = await Booking.find({})
      .select("customerName customerPhone customerEmail customerArea date status totalAmount price")
      .lean();

    type Row = {
      id: string;
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
      const key = (u.email || u.phone || u._id.toString()).toString();
      map.set(key, {
        id: u._id.toString(),
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
      const key = (b.customerEmail || b.customerPhone || b.customerName || "").toString();
      if (!key) continue;
      const prev = map.get(key) || {
        id: "",
        name: b.customerName || "",
        phone: b.customerPhone || "",
        email: b.customerEmail || "",
        area: b.customerArea || "",
        visits: 0,
        lastVisit: "",
        totalSpend: 0,
      };
      prev.visits += 1;
      prev.totalSpend += Number(b.totalAmount || (b as any).price || 0);
      if (!prev.lastVisit || b.date > prev.lastVisit) prev.lastVisit = b.date;
      if (b.customerArea) prev.area = b.customerArea;
      if (b.customerName) prev.name = b.customerName;
      map.set(key, prev);
    }

    let list = Array.from(map.values());
    if (area) {
      list = list.filter((c) => (c.area || "").toLowerCase().includes(area.toLowerCase()));
    }

    const byArea: Record<string, { count: number; visits: number; spend: number }> = {};
    for (const c of list) {
      const a = c.area || "Unknown";
      if (!byArea[a]) byArea[a] = { count: 0, visits: 0, spend: 0 };
      byArea[a].count += 1;
      byArea[a].visits += c.visits;
      byArea[a].spend += c.totalSpend;
    }

    list.sort((a, b) => b.totalSpend - a.totalSpend);
    return NextResponse.json({ ok: true, customers: list, byArea });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * PATCH — edit customer user by id
 * Body: { id, name?, phone?, email?, area? }
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const { id, name, phone, email, area } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const user = await User.findOne({ _id: id, role: "customer" });
    if (!user) return NextResponse.json({ ok: false, error: "Customer not found" }, { status: 404 });

    if (name) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (area !== undefined) user.area = String(area).trim();
    if (email && email.toLowerCase().trim() !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase().trim() });
      if (exists) return NextResponse.json({ ok: false, error: "Email in use" }, { status: 400 });
      user.email = email.toLowerCase().trim();
    }
    await user.save();
    return NextResponse.json({
      ok: true,
      customer: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        email: user.email,
        area: user.area,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * DELETE — remove customer user by id
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const user = await User.findOneAndDelete({ _id: id, role: "customer" });
    if (!user) return NextResponse.json({ ok: false, error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ ok: true, message: "Customer deleted" });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
