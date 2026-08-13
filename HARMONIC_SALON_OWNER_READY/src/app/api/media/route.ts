import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Media } from "@/models/Media";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET — public: active media. ?type=background_video&all=1 for admin */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const all = searchParams.get("all") === "1";
    const branchId = searchParams.get("branchId");

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user && (session.user as any).role === "admin";

    const q: Record<string, unknown> = {};
    if (!all || !isAdmin) q.isActive = true;
    if (type) q.type = type;
    if (branchId) q.branchId = branchId;

    const list = await Media.find(q).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json({ ok: true, media: list });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/**
 * POST — Admin only: add video/image URL
 *
 * [MARK] CLOUDINARY:
 *  Today: body.url = public link (mp4 / image CDN)
 *  Later: accept multipart file → src/lib/cloudinary.ts uploadToCloudinary()
 *         → save returned secure_url as Media.url
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ ok: false, error: "Only Admin can upload media" }, { status: 403 });
    }
    const body = await req.json();
    const { type, title, url, thumbnailUrl, branchId, branchName, isActive, sortOrder, notes } = body;
    if (!type || !url) {
      return NextResponse.json({ ok: false, error: "type and url required" }, { status: 400 });
    }
    const allowed = ["background_video", "gallery_image", "hero_image", "promo_video"];
    if (!allowed.includes(type)) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }

    // If setting new background video active, optionally deactivate older ones of same branch
    if (type === "background_video" && body.replaceOthers !== false) {
      const deactQ: Record<string, unknown> = { type: "background_video" };
      if (branchId) deactQ.branchId = branchId;
      await Media.updateMany(deactQ, { $set: { isActive: false } });
    }

    const doc = await Media.create({
      type,
      title: title || "",
      url: url.trim(),
      thumbnailUrl: thumbnailUrl || "",
      branchId: branchId || undefined,
      branchName: branchName || "",
      isActive: isActive === false ? false : true,
      sortOrder: Number(sortOrder) || 0,
      notes: notes || "",
      createdBy: (session.user as any).id,
    });
    return NextResponse.json({ ok: true, media: doc });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
