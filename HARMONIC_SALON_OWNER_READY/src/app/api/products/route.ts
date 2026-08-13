import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const all = new URL(req.url).searchParams.get("all") === "1";
    const q = all ? {} : { status: "Active" };
    const list = await Product.find(q).sort({ name: 1 }).lean();
    return NextResponse.json({ ok: true, products: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin/Manager only" }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name || body.sellPrice == null) {
      return NextResponse.json({ ok: false, error: "Name and sellPrice required" }, { status: 400 });
    }
    const product = await Product.create({
      name: body.name.trim(),
      sku: body.sku || "",
      category: body.category || "Hair Care",
      costPrice: Number(body.costPrice) || 0,
      sellPrice: Number(body.sellPrice),
      stock: Number(body.stock) || 0,
      unit: body.unit || "pcs",
      branchId: body.branchId || undefined,
      status: body.status === "Inactive" ? "Inactive" : "Active",
    });
    return NextResponse.json({ ok: true, product });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
