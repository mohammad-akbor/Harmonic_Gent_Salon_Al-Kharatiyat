import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Staff } from "@/models/Staff";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { isCloudinaryReady, uploadToCloudinary } from "@/lib/cloudinary";

/**
 * POST multipart — any logged-in user (Admin / Staff / Customer) uploads own profile picture
 * field: file (image, max 5MB)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Only images allowed" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Max 5MB" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    let url = "";

    if (isCloudinaryReady()) {
      const up = await uploadToCloudinary(bytes, {
        folder: `${process.env.CLOUDINARY_FOLDER || "harmonic-salon"}/profiles`,
        resourceType: "image",
      });
      if (!up.ok || !up.url) {
        return NextResponse.json({ ok: false, error: up.error || "Upload failed" }, { status: 500 });
      }
      url = up.url;
    } else {
      const dir = path.join(process.cwd(), "public", "uploads", "profiles");
      await mkdir(dir, { recursive: true });
      const name = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(path.join(dir, name), bytes);
      url = `/uploads/profiles/${name}`;
    }

    await connectDB();
    const userId = (session.user as any).id;
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: url },
      { new: true }
    ).select("-passwordHash");

    if (user?.staffId) {
      await Staff.findByIdAndUpdate(user.staffId, { profilePicture: url });
    }

    return NextResponse.json({
      ok: true,
      url,
      message: "Profile picture updated",
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
        profilePicture: url,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }
    await connectDB();
    const userId = (session.user as any).id;
    const user = await User.findByIdAndUpdate(userId, { profilePicture: "" }, { new: true });
    if (user?.staffId) {
      await Staff.findByIdAndUpdate(user.staffId, { profilePicture: "" });
    }
    return NextResponse.json({ ok: true, message: "Picture removed" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
