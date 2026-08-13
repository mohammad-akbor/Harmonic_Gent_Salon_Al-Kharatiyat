import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Expense } from "@/models/Expense";
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
    const list = await Expense.find(q).sort({ date: -1 }).lean();
    return NextResponse.json({ ok: true, expenses: list });
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
    if (!body.title || body.amount == null || !body.date) {
      return NextResponse.json({ ok: false, error: "title, amount, date required" }, { status: 400 });
    }
    const expense = await Expense.create({
      title: body.title.trim(),
      category: body.category || "Other",
      amount: Number(body.amount),
      date: body.date,
      branchId: body.branchId || undefined,
      notes: body.notes || "",
      paidTo: body.paidTo || "",
      createdBy: (session.user as any).id,
    });
    return NextResponse.json({ ok: true, expense });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
