import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { OtpCode } from "@/models/OtpCode";
import { sendMail } from "@/lib/mail";

/** POST { email } — send 6-digit OTP (valid 10 min) */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });
    }
    const normalized = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalized });
    if (!user) {
      // Don't reveal if email exists — still return ok for security, but no code
      return NextResponse.json({
        ok: true,
        message: "If this email is registered, an OTP was sent.",
        devCode: process.env.NODE_ENV === "development" ? null : undefined,
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpCode.deleteMany({ email: normalized });
    await OtpCode.create({ email: normalized, code, expiresAt, used: false });

    // Try email; always return code in development / when SMTP missing
    const mail = await sendMail({
      to: normalized,
      subject: "HARMONIC SALON — Login OTP",
      html: `<p>Your login code is <b style="font-size:24px">${code}</b></p><p>Valid 10 minutes.</p>`,
      text: `Your OTP: ${code} (valid 10 minutes)`,
    });

    const isDev = process.env.NODE_ENV !== "production" || !process.env.SMTP_HOST;

    return NextResponse.json({
      ok: true,
      message: mail.ok
        ? "OTP sent to your email"
        : "OTP generated. Check email if SMTP configured, or use devCode below.",
      // Show code when SMTP not set so you can test without email
      devCode: isDev || !mail.ok ? code : undefined,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
