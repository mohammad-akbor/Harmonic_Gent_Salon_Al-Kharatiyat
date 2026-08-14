"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  area: string;
  visits: number;
  lastVisit: string;
  totalSpend: number;
};

export default function CustomersPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [list, setList] = useState<Customer[]>([]);
  const [byArea, setByArea] = useState<Record<string, any>>({});
  const [areaFilter, setAreaFilter] = useState("");
  const [edit, setEdit] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", area: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !["admin", "manager"].includes((session?.user as any)?.role)) {
      toast.error("Admin only");
      router.push("/");
    }
  }, [status, session, router]);

  async function load(area?: string) {
    const q = area ? `?area=${encodeURIComponent(area)}` : "";
    const res = await fetch(`/api/customers${q}`);
    const data = await res.json();
    if (data.ok) {
      setList(data.customers || []);
      setByArea(data.byArea || {});
    }
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  function openEdit(c: Customer) {
    if (!c.id) {
      toast.error("Only registered customers can be edited (need user id)");
      return;
    }
    setEdit(c);
    setForm({ name: c.name, phone: c.phone, email: c.email, area: c.area });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit?.id) return;
    const res = await fetch("/api/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: edit.id, ...form }),
    });
    const d = await res.json();
    if (d.ok) {
      toast.success("Customer updated");
      setEdit(null);
      load(areaFilter || undefined);
    } else toast.error(d.error || "Failed");
  }

  async function remove(c: Customer) {
    if (!c.id) {
      toast.error("No user account linked — cannot delete");
      return;
    }
    if (!confirm(`Delete customer ${c.name}?`)) return;
    const res = await fetch(`/api/customers?id=${c.id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) {
      toast.success("Deleted");
      load(areaFilter || undefined);
    } else toast.error(d.error || "Failed");
  }

  const fmt = (n: number) => (n || 0).toLocaleString("en-QA", { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/admin" className="text-[#d4af37] font-bold">
              ← Admin
            </Link>
            <h1 className="text-xl font-bold">Customers</h1>
            <p className="text-xs text-slate-500">Edit / Delete registered customers</p>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Filter area e.g. Rayyan"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
            />
            <button
              type="button"
              onClick={() => load(areaFilter)}
              className="px-3 py-2 rounded-lg bg-[#d4af37]/20 text-[#d4af37] text-sm"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setAreaFilter("");
                load();
              }}
              className="px-3 py-2 rounded-lg bg-white/10 text-sm"
            >
              All
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(byArea).map(([area, v]: [string, any]) => (
            <button
              key={area}
              type="button"
              onClick={() => {
                setAreaFilter(area === "Unknown" ? "" : area);
                load(area === "Unknown" ? undefined : area);
              }}
              className="glass rounded-xl p-4 text-left hover:ring-1 hover:ring-[#d4af37]/30"
            >
              <div className="font-medium text-[#d4af37]">{area}</div>
              <div className="text-xs text-slate-400">
                {v.count} customers · {v.visits} visits · {fmt(v.spend)} QAR
              </div>
            </button>
          ))}
        </div>

        {/* Edit modal */}
        {edit && (
          <form onSubmit={saveEdit} className="glass rounded-2xl p-5 space-y-3 border border-[#d4af37]/30">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-[#d4af37]">Edit customer</h2>
              <button type="button" onClick={() => setEdit(null)} className="text-sm text-slate-400">
                Cancel
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
              />
              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
              />
              <input
                placeholder="Area"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
              />
            </div>
            <button type="submit" className="btn-glow px-6 py-2 rounded-xl">
              Save changes
            </button>
          </form>
        )}

        <div className="space-y-2">
          {list.map((c, i) => (
            <div
              key={c.id || c.email || c.phone || i}
              className="glass rounded-xl p-4 flex flex-wrap justify-between items-center gap-3"
            >
              <div>
                <div className="font-medium">{c.name || "—"}</div>
                <div className="text-xs text-slate-400">
                  {c.phone} {c.email && `· ${c.email}`} {c.area && `· ${c.area}`}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Visits: {c.visits} · Spend: {fmt(c.totalSpend)} QAR
                  {c.lastVisit && ` · Last: ${c.lastVisit}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!c.id}
                  onClick={() => openEdit(c)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#d4af37]/20 text-[#d4af37] disabled:opacity-40"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={!c.id}
                  onClick={() => remove(c)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-slate-500 py-8">No customers yet</p>}
        </div>
      </div>
    </div>
  );
}
