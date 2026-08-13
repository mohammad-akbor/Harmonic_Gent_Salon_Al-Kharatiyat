import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OtpCode } from "@/models/OtpCode";
import { User } from "@/models/User";

/**
 * POST { email, code }
 * Returns a one-time otpToken that login page uses with next-auth credentials
 * (password field = "OTP:" + code after verify marks used)
 *
 * Simpler path: return { ok, email, verified: true } and client calls
 * signIn with special password "otp:CODE" handled in authorize.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ ok: false, error: "Email and code required" }, { status: 400 });
    }
    const normalized = email.toLowerCase().trim();
    const otp = await OtpCode.findOne({
      email: normalized,
      code: String(code).trim(),
      used: false,
      expiresAt: { $gt: new Date() },
    });
    if (!otp) {
      return NextResponse.json({ ok: false, error: "Invalid or expired OTP" }, { status: 400 });
    }

    const user = await User.findOne({ email: normalized });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    otp.used = true;
    await otp.save();

    // Mark OTP as valid for next 2 minutes for authorize()
    await OtpCode.create({
      email: normalized,
      code: `VERIFIED:${code}`,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      used: false,
    });

    return NextResponse.json({
      ok: true,
      message: "OTP verified. Signing in...",
      email: normalized,
      otpPass: `otp:${code}`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
