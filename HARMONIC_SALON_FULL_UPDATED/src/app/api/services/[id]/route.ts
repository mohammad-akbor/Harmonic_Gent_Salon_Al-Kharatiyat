import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Service } from "@/models/Service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return null;
  }
  return session;
}

/** PATCH — update service (Admin only) */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Only Admin can update services" }, { status: 403 });
    }
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.category !== undefined) update.category = body.category;
    if (body.price !== undefined) update.price = Number(body.price);
    if (body.durationMin !== undefined) update.durationMin = Number(body.durationMin);
    if (body.status !== undefined) update.status = body.status;

    const service = await Service.findByIdAndUpdate(params.id, update, { new: true });
    if (!service) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, service });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE — soft or hard delete (Admin only) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Only Admin can delete services" }, { status: 403 });
    }
    await connectDB();
    // Soft delete preferred
    const service = await Service.findByIdAndUpdate(params.id, { status: "Inactive" }, { new: true });
    if (!service) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, service });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
