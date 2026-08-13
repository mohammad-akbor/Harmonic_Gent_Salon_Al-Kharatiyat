"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Staff = {
  _id: string;
  name: string;
  department: string;
  servicePercent?: number;
  productPercent?: number;
};

type Entry = {
  _id: string;
  date: string;
  staffId: string;
  staffName: string;
  totalClients: number;
  serviceSales: number;
  productSales: number;
  tips: number;
  cash: number;
  card: number;
  online: number;
  staffEarnings: number;
  servicePercent: number;
  productPercent: number;
};

export default function DailyEntryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState({
    staffId: "",
    totalClients: "",
    serviceSales: "",
    productSales: "",
    tips: "",
    cash: "",
    card: "",
    online: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function load() {
    const [s, e] = await Promise.all([
      fetch("/api/staff").then((r) => r.json()),
      fetch(`/api/daily-entries?date=${date}`).then((r) => r.json()),
    ]);
    if (s.ok) setStaffList(s.staff || []);
    if (e.ok) setEntries(e.entries || []);
  }

  useEffect(() => {
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staffId) {
      toast.error("Select staff");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/daily-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...form }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    if (data.check && data.check.match !== "OK") {
      toast.error(
        `Payment mismatch: ${data.check.match} (Sales ${data.check.salesTotal} vs Pay ${data.check.payTotal})`
      );
    } else {
      toast.success(`Saved · Earnings ${data.entry?.staffEarnings?.toFixed(0) || 0} QAR`);
    }
    setForm({
      staffId: "",
      totalClients: "",
      serviceSales: "",
      productSales: "",
      tips: "",
      cash: "",
      card: "",
      online: "",
      notes: "",
    });
    load();
  }

  const dayTotals = entries.reduce(
    (a, e) => ({
      clients: a.clients + (e.totalClients || 0),
      service: a.service + (e.serviceSales || 0),
      product: a.product + (e.productSales || 0),
      tips: a.tips + (e.tips || 0),
      cash: a.cash + (e.cash || 0),
      card: a.card + (e.card || 0),
      online: a.online + (e.online || 0),
      earnings: a.earnings + (e.staffEarnings || 0),
    }),
    { clients: 0, service: 0, product: 0, tips: 0, cash: 0, card: 0, online: 0, earnings: 0 }
  );

  async function importCsv() {
    if (!csvText.trim()) {
      toast.error("Paste CSV first");
      return;
    }
    setImporting(true);
    const res = await fetch("/api/daily-entries/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    });
    const data = await res.json();
    setImporting(false);
    if (data.ok) {
      toast.success(data.message || "Imported");
      if (data.errors?.length) toast.error(data.errors.slice(0, 3).join("; "));
      setCsvText("");
      load();
    } else {
      toast.error(data.error || "Import failed");
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading...</div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <Link href="/" className="text-[#d4af37] font-bold">
              ← Home
            </Link>
            <h1 className="text-xl font-bold">Daily Entry</h1>
            <p className="text-xs text-slate-400">প্রতিদিন প্রতি স্টাফ ১ লাইন → Dashboard/Salary অটো</p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
          />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Clients (SUM)</div>
            <div className="text-2xl font-bold text-[#d4af37]">{dayTotals.clients}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Service Sales</div>
            <div className="text-xl font-bold">{dayTotals.service} QAR</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Cash / Card / Online</div>
            <div className="text-sm font-semibold">
              {dayTotals.cash} / {dayTotals.card} / {dayTotals.online}
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Staff Earnings</div>
            <div className="text-xl font-bold text-emerald-400">{dayTotals.earnings.toFixed(0)} QAR</div>
          </div>
        </div>

        <form onSubmit={submit} className="glass rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-[#d4af37]">New entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <select
              required
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            >
              <option value="">Select staff</option>
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.department})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              placeholder="Total clients"
              value={form.totalClients}
              onChange={(e) => setForm({ ...form, totalClients: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Service sales QAR"
              value={form.serviceSales}
              onChange={(e) => setForm({ ...form, serviceSales: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Product sales QAR"
              value={form.productSales}
              onChange={(e) => setForm({ ...form, productSales: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Tips QAR"
              value={form.tips}
              onChange={(e) => setForm({ ...form, tips: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Cash"
              value={form.cash}
              onChange={(e) => setForm({ ...form, cash: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Card"
              value={form.card}
              onChange={(e) => setForm({ ...form, card: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Online"
              value={form.online}
              onChange={(e) => setForm({ ...form, online: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 sm:col-span-2"
            />
          </div>
          <p className="text-xs text-slate-500">
            Cash + Card + Online ≈ Service + Product. Earnings = Service×% + Product×% + Tips
          </p>
          <button type="submit" disabled={loading} className="btn-glow px-8 py-2.5 rounded-xl disabled:opacity-50">
            {loading ? "Saving..." : "Save Entry"}
          </button>
        </form>

        <div className="glass rounded-2xl p-5 overflow-x-auto">
          <h2 className="font-bold text-[#d4af37] mb-3">Entries for {date}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="pb-2 pr-2">Staff</th>
                <th className="pb-2 pr-2">Clients</th>
                <th className="pb-2 pr-2">Service</th>
                <th className="pb-2 pr-2">Product</th>
                <th className="pb-2 pr-2">Tips</th>
                <th className="pb-2 pr-2">Cash</th>
                <th className="pb-2 pr-2">Card</th>
                <th className="pb-2 pr-2">Online</th>
                <th className="pb-2">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id} className="border-b border-white/5">
                  <td className="py-2 pr-2 font-medium">{e.staffName}</td>
                  <td className="pr-2">{e.totalClients}</td>
                  <td className="pr-2">{e.serviceSales}</td>
                  <td className="pr-2">{e.productSales}</td>
                  <td className="pr-2">{e.tips}</td>
                  <td className="pr-2">{e.cash}</td>
                  <td className="pr-2">{e.card}</td>
                  <td className="pr-2">{e.online}</td>
                  <td className="font-bold text-[#d4af37]">{e.staffEarnings?.toFixed(0)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No entries yet for this date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="glass rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-[#d4af37]">Excel / CSV Bulk Import</h2>
          <p className="text-xs text-slate-400">
            Header: Date,Staff Name,Total Clients,Service Sales,Product Sales,Tips,Cash,Card,Online,Notes
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={5}
            placeholder={"Date,Staff Name,Total Clients,Service Sales,Product Sales,Tips,Cash,Card,Online\n2026-08-01,Massinissa,12,515,0,0,50,465,0"}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm font-mono"
          />
          <button
            type="button"
            onClick={importCsv}
            disabled={importing}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}
