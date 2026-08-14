"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [picture, setPicture] = useState("");

  const role = (session?.user as any)?.role || "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      setEmail((session?.user as any)?.email || "");
      setName((session?.user as any)?.name || "");
      setPicture((session?.user as any)?.profilePicture || "");
      // load full profile from API
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.user) {
            setEmail(d.user.email || "");
            setName(d.user.name || "");
            setPicture(d.user.profilePicture || "");
          }
        })
        .catch(() => {});
    }
  }, [status, session, router]);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/profile/picture", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setPicture(data.url);
        toast.success("Profile picture updated");
        // refresh session so nav shows new photo
        await update({ profilePicture: data.url });
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function removePhoto() {
    setUploading(true);
    const res = await fetch("/api/profile/picture", { method: "DELETE" });
    const data = await res.json();
    setUploading(false);
    if (data.ok) {
      setPicture("");
      toast.success("Picture removed");
      await update({ profilePicture: "" });
    } else toast.error(data.error || "Failed");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name,
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
      <div className="max-w-md mx-auto glass rounded-3xl p-8 space-y-8">
        <div>
          <Link href="/" className="text-[#d4af37] text-sm">
            ← Home
          </Link>
          <h1 className="text-2xl font-bold mt-2 mb-1">Account Settings</h1>
          <p className="text-slate-400 text-sm">
            Role: <span className="text-[#d4af37]">{role}</span>
            {role === "admin" && " · You can set Admin profile picture"}
          </p>
        </div>

        {/* ===== PROFILE PICTURE ===== */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={picture}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover border-2 border-[#d4af37] shadow-lg"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center text-4xl font-black text-[#0b1220]">
                {(name || email || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 text-center">
            Admin / Staff / Customer — everyone can set their own photo
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="btn-glow px-4 py-2 rounded-xl text-sm disabled:opacity-50"
            >
              {uploading ? "Uploading..." : picture ? "Change photo" : "Upload photo"}
            </button>
            {picture && (
              <button
                type="button"
                disabled={uploading}
                onClick={removePhoto}
                className="px-4 py-2 rounded-xl text-sm bg-white/10 hover:bg-white/20"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickPhoto}
          />
        </div>

        {/* ===== EMAIL / PASSWORD ===== */}
        <form onSubmit={save} className="space-y-4 border-t border-white/10 pt-6">
          <div>
            <label className="text-sm text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            />
          </div>
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
