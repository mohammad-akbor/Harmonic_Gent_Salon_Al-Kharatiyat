import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

/** GET current profile */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findById((session.user as any).id).select("-passwordHash").lean();
  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  return NextResponse.json({ ok: true, user });
}

/**
 * PATCH — change email and/or password
 * Body: { email?, currentPassword, newPassword? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }
    await connectDB();
    const body = await req.json();
    const { email, currentPassword, newPassword } = body;

    if (!currentPassword) {
      return NextResponse.json({ ok: false, error: "Current password required" }, { status: 400 });
    }

    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Current password is wrong" }, { status: 400 });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase().trim() });
      if (exists) {
        return NextResponse.json({ ok: false, error: "Email already in use" }, { status: 400 });
      }
      user.email = email.toLowerCase().trim();
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ ok: false, error: "New password min 6 characters" }, { status: 400 });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    return NextResponse.json({
      ok: true,
      message: "Profile updated. Login again if you changed email.",
      user: { email: user.email, name: user.name, role: user.role },
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
