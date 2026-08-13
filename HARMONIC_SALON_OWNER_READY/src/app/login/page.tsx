"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Welcome back!");
    // Role-based home
    try {
      const s = await fetch("/api/auth/session").then((r) => r.json());
      const role = s?.user?.role;
      if (role === "admin") router.push("/admin");
      else if (role === "staff" || role === "manager") router.push("/dashboard");
      else router.push("/");
    } catch {
      router.push("/");
    }
    router.refresh();
  }

  async function sendOtp() {
    if (!email) {
      toast.error("Enter email first");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      setOtpSent(true);
      if (data.devCode) {
        setDevCode(data.devCode);
        toast.success(`OTP: ${data.devCode} (dev mode — SMTP not set)`);
      } else {
        toast.success(data.message || "OTP sent");
      }
    } else toast.error(data.error || "Failed");
  }

  async function handleOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const ver = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otp }),
    });
    const vdata = await ver.json();
    if (!vdata.ok) {
      setLoading(false);
      toast.error(vdata.error || "Invalid OTP");
      return;
    }
    const res = await signIn("credentials", {
      email: vdata.email,
      password: vdata.otpPass,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("OTP login failed");
      return;
    }
    toast.success("Logged in with OTP!");
    try {
      const s = await fetch("/api/auth/session").then((r) => r.json());
      const role = s?.user?.role;
      if (role === "admin") router.push("/admin");
      else if (role === "staff" || role === "manager") router.push("/dashboard");
      else router.push("/");
    } catch {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="glass card-3d rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center font-black text-2xl text-[#0b1220] mb-3">
              H
            </div>
          </Link>
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-slate-400 text-sm mt-1">Customer · Staff · Admin</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex-1 py-2 rounded-lg text-sm ${mode === "password" ? "bg-[#d4af37]/20 text-[#d4af37]" : "bg-white/5"}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode("otp")}
            className={`flex-1 py-2 rounded-lg text-sm ${mode === "otp" ? "bg-[#d4af37]/20 text-[#d4af37]" : "bg-white/5"}`}
          >
            OTP Email
          </button>
        </div>

        {mode === "password" ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-glow w-full py-3 rounded-xl disabled:opacity-60">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none"
              />
            </div>
            {!otpSent ? (
              <button
                type="button"
                onClick={sendOtp}
                disabled={loading}
                className="btn-glow w-full py-3 rounded-xl disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">6-digit OTP</label>
                  <input
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none tracking-widest text-center text-lg"
                    placeholder="000000"
                  />
                  {devCode && (
                    <p className="text-xs text-amber-400 mt-2">Dev OTP: {devCode}</p>
                  )}
                </div>
                <button type="submit" disabled={loading} className="btn-glow w-full py-3 rounded-xl disabled:opacity-60">
                  {loading ? "Verifying..." : "Verify &amp; Login"}
                </button>
                <button type="button" onClick={sendOtp} className="w-full text-sm text-slate-400 hover:text-white">
                  Resend OTP
                </button>
              </>
            )}
          </form>
        )}

        <p className="text-center text-sm text-slate-400 mt-6">
          No account?{" "}
          <Link href="/register" className="text-[#d4af37] hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
