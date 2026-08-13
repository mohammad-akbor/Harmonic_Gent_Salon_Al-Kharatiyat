import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Purchase } from "@/models/Purchase";
import { Product } from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q: Record<string, unknown> = {};
    if (from && to) q.date = { $gte: from, $lte: to };
    const list = await Purchase.find(q).sort({ date: -1 }).lean();
    return NextResponse.json({ ok: true, purchases: list });
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
    const { productId, quantity, unitCost, date, supplier, notes, branchId } = body;
    if (!productId || !quantity || unitCost == null || !date) {
      return NextResponse.json({ ok: false, error: "productId, quantity, unitCost, date required" }, { status: 400 });
    }
    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

    const qty = Number(quantity);
    const cost = Number(unitCost);
    const totalCost = qty * cost;

    const purchase = await Purchase.create({
      productId,
      productName: product.name,
      quantity: qty,
      unitCost: cost,
      totalCost,
      date,
      supplier: supplier || "",
      branchId: branchId || undefined,
      notes: notes || "",
      createdBy: (session.user as any).id,
    });

    // Increase stock + update cost price
    product.stock = (product.stock || 0) + qty;
    product.costPrice = cost;
    await product.save();

    return NextResponse.json({ ok: true, purchase, newStock: product.stock });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
