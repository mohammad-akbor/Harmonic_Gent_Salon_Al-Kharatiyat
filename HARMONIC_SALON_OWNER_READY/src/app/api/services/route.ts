import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Service } from "@/models/Service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/services — public active, or all for admin */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "1";
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user && ["admin", "manager"].includes((session.user as any).role);
    const q = all && isAdmin ? {} : { status: "Active" };
    const list = await Service.find(q).sort({ category: 1, name: 1 }).lean();
    return NextResponse.json({ ok: true, services: list });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/services — ADMIN ONLY create */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ ok: false, error: "Only Admin can create services" }, { status: 403 });
    }
    const body = await req.json();
    const { name, category, price, durationMin, status } = body;
    if (!name || price == null) {
      return NextResponse.json({ ok: false, error: "Name and price required" }, { status: 400 });
    }
    const service = await Service.create({
      name: name.trim(),
      category: category || "Barber",
      price: Number(price),
      durationMin: Number(durationMin) || 30,
      status: status === "Inactive" ? "Inactive" : "Active",
    });
    return NextResponse.json({ ok: true, service });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
