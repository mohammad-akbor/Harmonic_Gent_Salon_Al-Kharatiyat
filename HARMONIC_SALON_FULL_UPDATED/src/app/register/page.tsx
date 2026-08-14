"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

/** Public register — CUSTOMERS ONLY. Staff/Admin are created by Admin panel. */
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    area: "",
  });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "customer" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      toast.success(data.message || "Account created!");
      router.push("/login");
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="glass card-3d rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center font-black text-2xl text-[#0b1220] mb-3">
              H
            </div>
          </Link>
          <h1 className="text-2xl font-bold">Customer Register</h1>
          <p className="text-slate-400 text-sm mt-1">Only customers create account here</p>
          <p className="text-xs text-slate-500 mt-2">Staff & Admin accounts are created by Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Full name</label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
              placeholder="974xxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Area (optional)</label>
            <input
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
              placeholder="Al Rayyan, Doha..."
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password (min 6)</label>
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-glow w-full py-3 rounded-xl disabled:opacity-50">
            {loading ? "Creating..." : "Create customer account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have account?{" "}
          <Link href="/login" className="text-[#d4af37]">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
