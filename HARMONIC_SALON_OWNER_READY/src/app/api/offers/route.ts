import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Offer } from "@/models/Offer";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "1";
    const q: any = all ? {} : { isActive: true };
    const offers = await Offer.find(q).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json({ ok: true, offers });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    await connectDB();
    const body = await req.json();
    if (!body.title) return NextResponse.json({ ok: false, error: "Title required" }, { status: 400 });
    const offer = await Offer.create({
      title: body.title,
      description: body.description || "",
      discountPercent: Number(body.discountPercent) || 0,
      discountAmount: Number(body.discountAmount) || 0,
      code: body.code || "",
      imageUrl: body.imageUrl || "",
      startDate: body.startDate || "",
      endDate: body.endDate || "",
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ ok: true, offer });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await Offer.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
