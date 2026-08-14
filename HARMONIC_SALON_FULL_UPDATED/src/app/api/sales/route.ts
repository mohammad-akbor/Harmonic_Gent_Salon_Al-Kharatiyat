import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sale } from "@/models/Sale";
import { Product } from "@/models/Product";
import { Staff } from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const staffId = searchParams.get("staffId");
    const q: Record<string, unknown> = {};
    if (from && to) q.date = { $gte: from, $lte: to };
    if (staffId) q.staffId = staffId;
    const session = await getServerSession(authOptions);
    if (session?.user && (session.user as any).role === "staff" && (session.user as any).staffId) {
      q.staffId = (session.user as any).staffId;
    }
    const list = await Sale.find(q).sort({ date: -1 }).lean();
    return NextResponse.json({ ok: true, sales: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * POST product sale.
 * Staff commission = totalAmount * staff.productPercent (default 5%)
 * Example: 100 QAR product, 5% → staff gets 5 QAR
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }
    const body = await req.json();
    const { productId, quantity, staffId, customerName, customerPhone, date, notes, branchId } = body;
    if (!productId || !quantity || !date) {
      return NextResponse.json({ ok: false, error: "productId, quantity, date required" }, { status: 400 });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== "Active") {
      return NextResponse.json({ ok: false, error: "Product not available" }, { status: 400 });
    }
    const qty = Number(quantity);
    if ((product.stock || 0) < qty) {
      return NextResponse.json({ ok: false, error: `Insufficient stock (have ${product.stock})` }, { status: 400 });
    }

    let staffName = "";
    let commissionRate = 0.05;
    if (staffId) {
      const staff = await Staff.findById(staffId);
      if (staff) {
        staffName = staff.name;
        commissionRate = staff.productPercent ?? 0.05;
      }
    }

    const unitPrice = product.sellPrice;
    const totalAmount = unitPrice * qty;
    const costTotal = (product.costPrice || 0) * qty;
    const staffCommission = totalAmount * commissionRate;

    const sale = await Sale.create({
      productId,
      productName: product.name,
      quantity: qty,
      unitPrice,
      totalAmount,
      costTotal,
      staffId: staffId || undefined,
      staffName,
      staffCommission,
      commissionRate,
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      branchId: branchId || undefined,
      date,
      notes: notes || "",
      createdBy: (session.user as any).id,
    });

    product.stock = (product.stock || 0) - qty;
    await product.save();

    return NextResponse.json({ ok: true, sale });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
