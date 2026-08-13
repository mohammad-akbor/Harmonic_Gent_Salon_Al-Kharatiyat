"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      setEmail((session?.user as any)?.email || "");
    }
  }, [status, session, router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        currentPassword,
        newPassword: newPassword || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      toast.success(data.message || "Updated");
      setCurrentPassword("");
      setNewPassword("");
    } else toast.error(data.error || "Failed");
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-md mx-auto glass rounded-3xl p-8">
        <Link href="/" className="text-[#d4af37] text-sm">← Home</Link>
        <h1 className="text-2xl font-bold mt-2 mb-1">Account Settings</h1>
        <p className="text-slate-400 text-sm mb-6">
          Change email or password · Role:{" "}
          <span className="text-[#d4af37]">{(session?.user as any)?.role}</span>
        </p>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-sm text-slate-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">Current password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">New password (optional)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep"
              className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-glow w-full py-3 rounded-xl disabled:opacity-50">
            {loading ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
