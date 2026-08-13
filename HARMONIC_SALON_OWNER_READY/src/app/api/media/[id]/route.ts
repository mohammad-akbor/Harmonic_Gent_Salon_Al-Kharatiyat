import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Media } from "@/models/Media";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    ["title", "url", "thumbnailUrl", "branchName", "notes", "type"].forEach((k) => {
      if (body[k] !== undefined) update[k] = body[k];
    });
    if (body.isActive !== undefined) update.isActive = !!body.isActive;
    if (body.sortOrder !== undefined) update.sortOrder = Number(body.sortOrder);
    if (body.branchId !== undefined) update.branchId = body.branchId || null;

    // Activating background → deactivate others
    if (body.isActive === true) {
      const current = await Media.findById(params.id);
      if (current?.type === "background_video") {
        await Media.updateMany(
          { type: "background_video", _id: { $ne: params.id } },
          { $set: { isActive: false } }
        );
      }
    }

    const media = await Media.findByIdAndUpdate(params.id, update, { new: true });
    if (!media) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, media });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }
    await connectDB();
    await Media.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
