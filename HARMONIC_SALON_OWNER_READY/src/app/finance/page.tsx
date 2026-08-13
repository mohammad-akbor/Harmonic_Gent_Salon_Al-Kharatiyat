"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type PL = any;

export default function FinancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 8) + "01");
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [pl, setPl] = useState<PL | null>(null);
  const [yearPL, setYearPL] = useState<PL | null>(null);
  const [loading, setLoading] = useState(false);
  const [deductionForm, setDeductionForm] = useState({
    staffId: "",
    type: "Penalty",
    amount: "",
    reason: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [allStaff, setAllStaff] = useState<{ _id: string; name: string }[]>([]);
  const [showDeduction, setShowDeduction] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !["admin", "manager"].includes((session?.user as any)?.role)) {
      toast.error("Admin/Manager only");
      router.push("/");
    }
  }, [status, session, router]);

  async function load() {
    setLoading(true);
    try {
      const yearStart = from.slice(0, 4) + "-01-01";
      const [plRes, yearRes, staffRes] = await Promise.all([
        fetch(`/api/finance?mode=pl&from=${from}&to=${to}`).then((r) => r.json()),
        fetch(`/api/finance?mode=pl&from=${yearStart}&to=${to}`).then((r) => r.json()),
        fetch("/api/staff?all=1").then((r) => r.json()),
      ]);
      if (plRes.ok) setPl(plRes.pl);
      if (yearRes.ok) setYearPL(yearRes.pl);
      if (staffRes.ok) setAllStaff(staffRes.staff);
    } catch {
      toast.error("Load failed");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to]);

  async function postDeduction(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/deductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...deductionForm, amount: Number(deductionForm.amount) }),
    });
    const d = await res.json();
    if (d.ok) {
      toast.success("Deduction saved · staff net ↓ · salon retained ↑");
      setShowDeduction(false);
      load();
    } else toast.error(d.error);
  }

  const fmt = (n: number) =>
    (n ?? 0).toLocaleString("en-QA", { maximumFractionDigits: 0 }) + " QAR";

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen pb-20">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <Link href="/" className="text-[#d4af37] font-bold">← Home</Link>
            <h1 className="text-xl font-bold">Monthly Report · P&amp;L</h1>
            <p className="text-xs text-slate-400">Excel formula same · Daily Entry driven</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-sm" />
            <span className="text-slate-500">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-sm" />
            <Link href="/salary" className="px-3 py-1.5 rounded-lg bg-[#d4af37]/20 text-[#d4af37] text-sm">Daily Entry</Link>
            <button onClick={() => setShowDeduction(!showDeduction)} className="px-3 py-1.5 rounded-lg glass text-sm">+ Deduction</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {showDeduction && (
          <form onSubmit={postDeduction} className="glass rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3">
            <select required value={deductionForm.staffId} onChange={(e) => setDeductionForm({ ...deductionForm, staffId: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
              <option value="">Staff</option>
              {allStaff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select value={deductionForm.type} onChange={(e) => setDeductionForm({ ...deductionForm, type: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
              {["Penalty", "Visa", "Advance", "Other"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <input required type="number" placeholder="Amount" value={deductionForm.amount} onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
            <input required placeholder="Reason" value={deductionForm.reason} onChange={(e) => setDeductionForm({ ...deductionForm, reason: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
            <button type="submit" className="btn-glow rounded-lg py-2">Apply</button>
          </form>
        )}

        {loading && <p className="text-slate-400">Calculating...</p>}

        {pl && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass card-3d rounded-2xl p-5">
                <div className="text-xs text-slate-400">TOTAL REVENUE</div>
                <div className="text-2xl font-black text-emerald-400">{fmt(pl.income.totalRevenue)}</div>
                <div className="text-xs text-slate-500 mt-1">Svc {fmt(pl.income.serviceRevenue)} · Prod {fmt(pl.income.productRevenue)}</div>
              </div>
              <div className="glass card-3d rounded-2xl p-5">
                <div className="text-xs text-slate-400">CASH / CARD / ONLINE</div>
                <div className="text-lg font-bold">{fmt(pl.payments.cash)}</div>
                <div className="text-xs text-slate-400">{fmt(pl.payments.card)} card · {fmt(pl.payments.online)} online</div>
              </div>
              <div className="glass card-3d rounded-2xl p-5">
                <div className="text-xs text-slate-400">TOTAL CLIENTS (SUM)</div>
                <div className="text-2xl font-black text-[#d4af37]">{pl.clients.totalClients}</div>
                <div className="text-xs text-slate-500">{pl.clients.daysWithCustomers} days with customers</div>
              </div>
              <div className={`glass card-3d rounded-2xl p-5 ${pl.profit.isProfit ? "ring-1 ring-emerald-500/40" : "ring-1 ring-red-500/40"}`}>
                <div className="text-xs text-slate-400">NET PROFIT / LOSS</div>
                <div className={`text-2xl font-black ${pl.profit.net >= 0 ? "text-[#d4af37]" : "text-red-400"}`}>{fmt(pl.profit.net)}</div>
                <div className="text-xs text-slate-500">{pl.profit.isProfit ? "PROFIT" : "LOSS"}</div>
              </div>
            </div>

            {/* Year */}
            {yearPL && (
              <div className="glass rounded-xl p-4 flex flex-wrap gap-6 text-sm">
                <span className="text-slate-400">Year {from.slice(0, 4)}:</span>
                <span>Revenue <b className="text-emerald-400">{fmt(yearPL.income.totalRevenue)}</b></span>
                <span>Clients <b className="text-[#d4af37]">{yearPL.clients.totalClients}</b></span>
                <span>Net <b className={yearPL.profit.net >= 0 ? "text-[#d4af37]" : "text-red-400"}>{fmt(yearPL.profit.net)}</b></span>
              </div>
            )}

            {/* Income / Costs breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-5 space-y-2 text-sm">
                <h3 className="font-bold text-emerald-400 mb-2">1. INCOME (+)</h3>
                <div className="flex justify-between"><span>Service Sales</span><span>{fmt(pl.income.serviceRevenue)}</span></div>
                <div className="flex justify-between"><span>Product Sales</span><span>{fmt(pl.income.productRevenue)}</span></div>
                <div className="flex justify-between font-bold border-t border-white/10 pt-2"><span>TOTAL REVENUE</span><span>{fmt(pl.income.totalRevenue)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Tips collected</span><span>{fmt(pl.income.tipsCollected)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Deductions retained</span><span>{fmt(pl.income.deductionsRetained)}</span></div>
              </div>
              <div className="glass rounded-2xl p-5 space-y-2 text-sm">
                <h3 className="font-bold text-red-400 mb-2">2. COSTS (−)</h3>
                <div className="flex justify-between"><span>Staff Commission (svc+prod)</span><span>{fmt(pl.costs.totalCommission)}</span></div>
                <div className="flex justify-between"><span>Tips paid to staff</span><span>{fmt(pl.costs.tipsPaidToStaff)}</span></div>
                <div className="flex justify-between"><span>Fixed Salaries</span><span>{fmt(pl.costs.fixedSalaries)}</span></div>
                <div className="flex justify-between"><span>Shop Expenses</span><span>{fmt(pl.costs.expenses)}</span></div>
                <div className="flex justify-between"><span>Product Purchases</span><span>{fmt(pl.costs.purchases)}</span></div>
                <div className="flex justify-between font-bold border-t border-white/10 pt-2"><span>TOTAL COSTS</span><span>{fmt(pl.costs.totalCommission + pl.costs.tipsPaidToStaff + pl.costs.fixedSalaries + pl.costs.expenses + pl.costs.purchases)}</span></div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5 text-sm">
              <h3 className="font-bold text-[#d4af37] mb-2">3. DEDUCTIONS KEPT BY SALON (+)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>Penalty: {fmt(pl.income.penaltyIncome)}</div>
                <div>Visa/Ticket: {fmt(pl.income.visaIncome)}</div>
                <div>Advance: {fmt(pl.income.advanceIncome)}</div>
                <div>Other: {fmt(pl.income.otherIncome)}</div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Formula: Revenue − Commission − Tips − Fixed − Expenses − Purchases + Deductions = <b className="text-[#d4af37]">{fmt(pl.profit.net)}</b>
              </p>
            </div>

            {/* Staff performance */}
            <div className="glass rounded-2xl p-5 overflow-x-auto">
              <h3 className="font-bold text-[#d4af37] mb-3">4. STAFF PERFORMANCE</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/10">
                    <th className="pb-2 pr-2">Staff</th>
                    <th className="pb-2 pr-2">Dept</th>
                    <th className="pb-2 pr-2">Clients</th>
                    <th className="pb-2 pr-2">Service</th>
                    <th className="pb-2 pr-2">Product</th>
                    <th className="pb-2 pr-2">Cash</th>
                    <th className="pb-2 pr-2">Card</th>
                    <th className="pb-2 pr-2">Gross</th>
                    <th className="pb-2 pr-2">Cuts</th>
                    <th className="pb-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(pl.staff?.list || []).map((s: any) => (
                    <tr key={s.staffId} className="border-b border-white/5">
                      <td className="py-2 pr-2 font-medium">{s.staffName}</td>
                      <td className="pr-2 text-slate-400">{s.department}</td>
                      <td className="pr-2">{s.totalClients}</td>
                      <td className="pr-2">{s.serviceSales?.toFixed(0)}</td>
                      <td className="pr-2">{s.productSales?.toFixed(0)}</td>
                      <td className="pr-2">{s.cash?.toFixed(0)}</td>
                      <td className="pr-2">{s.card?.toFixed(0)}</td>
                      <td className="pr-2 text-emerald-300">{s.grossEarnings?.toFixed(0)}</td>
                      <td className="pr-2 text-red-400">−{s.totalCuts?.toFixed(0)}</td>
                      <td className="font-bold text-[#d4af37]">{s.netEarnings?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex flex-wrap gap-4 text-sm border-t border-white/10 pt-3">
                <span>Gross payable: <b>{fmt(pl.staff.grossPayable)}</b></span>
                <span>Net payable all staff: <b className="text-[#d4af37]">{fmt(pl.staff.netPayable)}</b></span>
              </div>
            </div>

            {/* Daily customers */}
            {pl.clients.dailyCustomers?.length > 0 && (
              <div className="glass rounded-2xl p-5 overflow-x-auto">
                <h3 className="font-bold text-[#d4af37] mb-3">6. DAILY CUSTOMER COUNT</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-white/10">
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">Customers (SUM)</th>
                      <th className="pb-2 pr-3">Service Sales</th>
                      <th className="pb-2 pr-3">Cash</th>
                      <th className="pb-2">Card</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pl.clients.dailyCustomers.map((d: any) => (
                      <tr key={d.date} className="border-b border-white/5">
                        <td className="py-1.5 pr-3">{d.date}</td>
                        <td className="pr-3 font-medium">{d.clients}</td>
                        <td className="pr-3">{d.serviceSales?.toFixed(0)}</td>
                        <td className="pr-3">{d.cash?.toFixed(0)}</td>
                        <td>{d.card?.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-slate-500 mt-2">Month total clients = SUM all days (never divide by staff count)</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
