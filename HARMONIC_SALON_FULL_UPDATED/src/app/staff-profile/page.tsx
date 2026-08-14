"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

function Inner() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "admin" || role === "manager";
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [earn, setEarn] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avg, setAvg] = useState(0);

  const from = `${month}-01`;
  const to = (() => {
    const [y, m] = month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${month}-${String(last).padStart(2, "0")}`;
  })();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/finance?mode=staff&staffId=${id}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setEarn(d.earnings || d.staff || d);
      });
    fetch(`/api/reviews?staffId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setReviews(d.reviews || []);
          setAvg(d.average || 0);
        }
      });
  }, [id, from, to]);

  const fmt = (n: number) => (n ?? 0).toLocaleString("en-QA", { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-[#d4af37] font-bold">
            ← Home
          </Link>
          <h1 className="font-bold">Staff profile</h1>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-sm" />
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {earn && (
          <div className="glass rounded-2xl p-5 space-y-2">
            <h2 className="text-xl font-bold text-[#d4af37]">{earn.staffName || "Staff"}</h2>
            <p className="text-sm text-slate-400">
              {earn.salaryType} · Reviews ★ {avg} ({reviews.length})
            </p>
            {isAdmin && (
              <p className="text-xs text-slate-500">
                Service {(earn.servicePercent * 100).toFixed(0)}% · Product {(earn.productPercent * 100).toFixed(0)}%
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-white/5">
                <div className="text-xs text-slate-400">Clients this month</div>
                <div className="text-2xl font-bold">{earn.totalClients || 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <div className="text-xs text-slate-400">Service sales</div>
                <div className="text-xl font-bold">{fmt(earn.serviceSales)} QAR</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <div className="text-xs text-slate-400">Your commission</div>
                <div className="text-xl font-bold text-emerald-400">
                  {fmt((earn.serviceCommission || 0) + (earn.productCommission || 0))} QAR
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <div className="text-xs text-slate-400">Tips</div>
                <div className="text-xl font-bold">{fmt(earn.tipsAmount)} QAR</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <div className="text-xs text-slate-400">Cuts (penalty/visa/advance)</div>
                <div className="text-xl font-bold text-red-400">−{fmt(earn.totalCuts)} QAR</div>
              </div>
              <div className="p-3 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30">
                <div className="text-xs text-slate-400">Net earnings</div>
                <div className="text-2xl font-bold text-[#d4af37]">{fmt(earn.netEarnings)} QAR</div>
              </div>
            </div>
          </div>
        )}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-3">Customer reviews</h3>
          {reviews.length === 0 && <p className="text-slate-500 text-sm">No reviews yet</p>}
          {reviews.map((r) => (
            <div key={r._id} className="border-b border-white/5 py-2">
              <div className="text-amber-300 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              <div className="text-sm">{r.comment || "—"}</div>
              <div className="text-xs text-slate-500">{r.customerName}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StaffProfilePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <Inner />
    </Suspense>
  );
}
