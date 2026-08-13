import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Media } from "@/models/Media";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { isCloudinaryReady, uploadToCloudinary } from "@/lib/cloudinary";

/**
 * POST multipart/form-data
 * fields: file, type (background_video|gallery_image|...), title?
 *
 * [MARK] CLOUDINARY: if CLOUDINARY_* set → cloud upload
 * else → save under public/uploads/ (local / Vercel ephemeral)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = String(form.get("type") || "gallery_image");
    const title = String(form.get("title") || "");

    if (!file) {
      return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    }

    const allowed = ["background_video", "gallery_image", "hero_image", "promo_video", "story"];
    if (!allowed.includes(type)) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
    let url = "";

    if (isCloudinaryReady()) {
      const up = await uploadToCloudinary(bytes, {
        folder: process.env.CLOUDINARY_FOLDER || "harmonic-salon",
        resourceType: isVideo ? "video" : "image",
      });
      if (!up.ok || !up.url) {
        return NextResponse.json({ ok: false, error: up.error || "Cloudinary failed" }, { status: 500 });
      }
      url = up.url;
    } else {
      // Local fallback
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      const safe = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(path.join(uploadsDir, safe), bytes);
      url = `/uploads/${safe}`;
    }

    await connectDB();
    if (type === "background_video") {
      await Media.updateMany({ type: "background_video" }, { $set: { isActive: false } });
    }

    const media = await Media.create({
      type,
      title: title || file.name,
      url,
      isActive: true,
      sortOrder: 0,
      createdBy: (session.user as any).id,
    });

    return NextResponse.json({
      ok: true,
      media,
      storage: isCloudinaryReady() ? "cloudinary" : "local",
      message: isCloudinaryReady()
        ? "Uploaded to Cloudinary"
        : "Saved locally in /public/uploads (add Cloudinary for permanent cloud storage)",
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
