import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    ["name", "sku", "category", "unit", "status"].forEach((k) => {
      if (body[k] !== undefined) update[k] = body[k];
    });
    if (body.costPrice !== undefined) update.costPrice = Number(body.costPrice);
    if (body.sellPrice !== undefined) update.sellPrice = Number(body.sellPrice);
    if (body.stock !== undefined) update.stock = Number(body.stock);
    if (body.branchId !== undefined) update.branchId = body.branchId;
    const product = await Product.findByIdAndUpdate(params.id, update, { new: true });
    if (!product) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, product });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    await connectDB();
    await Product.findByIdAndUpdate(params.id, { status: "Inactive" });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
