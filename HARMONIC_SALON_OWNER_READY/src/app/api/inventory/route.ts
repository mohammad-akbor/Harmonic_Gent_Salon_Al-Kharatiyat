import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET — inventory list + low stock */
export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({}).sort({ name: 1 }).lean();
    const lowStock = products.filter((p) => (p.stock || 0) <= (p.minStock ?? 5));
    const totalValue = products.reduce((a, p) => a + (p.stock || 0) * (p.costPrice || 0), 0);
    return NextResponse.json({
      ok: true,
      products,
      lowStock,
      summary: {
        items: products.length,
        lowStockCount: lowStock.length,
        stockValueCost: totalValue,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * POST adjust stock
 * { productId, delta: +10 or -2, reason? }
 * or { productId, setStock: 50 }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin/Manager only" }, { status: 403 });
    }
    const body = await req.json();
    const product = await Product.findById(body.productId);
    if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

    if (body.setStock != null) {
      product.stock = Math.max(0, Number(body.setStock));
    } else if (body.delta != null) {
      product.stock = Math.max(0, (product.stock || 0) + Number(body.delta));
    } else {
      return NextResponse.json({ ok: false, error: "delta or setStock required" }, { status: 400 });
    }
    if (body.minStock != null) product.minStock = Number(body.minStock);
    await product.save();
    return NextResponse.json({ ok: true, product, low: product.stock <= (product.minStock ?? 5) });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
