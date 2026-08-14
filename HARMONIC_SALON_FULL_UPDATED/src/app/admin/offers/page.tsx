"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminOffersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [offers, setOffers] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    discountPercent: "",
    discountAmount: "",
    code: "",
    endDate: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.push("/");
    }
  }, [status, session, router]);

  function load() {
    fetch("/api/offers?all=1")
      .then((r) => r.json())
      .then((d) => d.ok && setOffers(d.offers || []));
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        discountPercent: Number(form.discountPercent) || 0,
        discountAmount: Number(form.discountAmount) || 0,
      }),
    });
    const d = await res.json();
    if (d.ok) {
      toast.success("Offer added");
      setForm({ title: "", description: "", discountPercent: "", discountAmount: "", code: "", endDate: "" });
      load();
    } else toast.error(d.error || "Failed");
  }

  async function remove(id: string) {
    if (!confirm("Delete this offer?")) return;
    const res = await fetch(`/api/offers?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) {
      toast.success("Deleted");
      load();
    } else toast.error(d.error || "Failed");
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/admin" className="text-[#d4af37] font-bold">
            ← Admin
          </Link>
          <h1 className="font-bold">Offers</h1>
          <Link href="/offers" className="text-sm text-slate-400">
            Public view
          </Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <form onSubmit={add} className="glass rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-[#d4af37]">Add Offer</h2>
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="% off"
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="number"
              placeholder="QAR off"
              value={form.discountAmount}
              onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Code (optional)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
          </div>
          <button type="submit" className="btn-glow w-full py-2 rounded-xl">
            + Add Offer
          </button>
        </form>
        <div className="space-y-2">
          {offers.map((o) => (
            <div key={o._id} className="glass rounded-xl p-4 flex justify-between items-start gap-3">
              <div>
                <div className="font-medium">{o.title}</div>
                <div className="text-xs text-slate-400">{o.description}</div>
                <div className="text-xs text-[#d4af37] mt-1">
                  {o.discountPercent ? `${o.discountPercent}% ` : ""}
                  {o.discountAmount ? `${o.discountAmount} QAR ` : ""}
                  {o.code ? `· ${o.code}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(o._id)}
                className="text-xs text-red-400 px-2 py-1 rounded bg-red-500/10"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
