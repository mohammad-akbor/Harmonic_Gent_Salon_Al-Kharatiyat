import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Branch } from "@/models/Branch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const list = await Branch.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ ok: true, branches: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
    const branch = await Branch.create({
      name: body.name.trim(),
      code: body.code || "",
      address: body.address || "",
      phone: body.phone || "",
      city: body.city || "Doha",
      status: body.status === "Inactive" ? "Inactive" : "Active",
      notes: body.notes || "",
    });
    return NextResponse.json({ ok: true, branch });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
