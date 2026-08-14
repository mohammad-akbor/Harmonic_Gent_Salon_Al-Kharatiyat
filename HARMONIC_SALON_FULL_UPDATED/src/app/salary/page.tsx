"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type StaffEarn = {
  staffId: string;
  staffName: string;
  department?: string;
  serviceCommission: number;
  productCommission: number;
  tipsAmount: number;
  fixedAmount: number;
  totalCuts: number;
  grossEarnings: number;
  netEarnings: number;
  completedBookings: number;
};

type Payment = {
  _id: string;
  staffId: string;
  staffName: string;
  netPaid: number;
  grossAmount: number;
  locked: boolean;
  date: string;
  periodKey: string;
};

export default function SalaryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [staffList, setStaffList] = useState<StaffEarn[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const periodStart = `${month}-01`;
  const periodEnd = (() => {
    const [y, m] = month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${month}-${String(last).padStart(2, "0")}`;
  })();

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
      const [plRes, payRes] = await Promise.all([
        fetch(`/api/finance?mode=pl&from=${periodStart}&to=${periodEnd}`).then((r) => r.json()),
        fetch(`/api/salary?periodKey=${month}`).then((r) => r.json()),
      ]);
      if (plRes.ok) setStaffList(plRes.pl?.staff?.list || []);
      if (payRes.ok) setPayments(payRes.payments || []);
    } catch {
      toast.error("Load failed");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, month]);

  const paidMap = Object.fromEntries(payments.map((p) => [p.staffId?.toString?.() || p.staffId, p]));
  const isPeriodLocked = payments.length > 0 && payments.every((p) => p.locked);
  const totalNet = staffList.reduce((a, s) => a + (s.netEarnings || 0), 0);
  const totalPaid = payments.reduce((a, p) => a + (p.netPaid || 0), 0);

  async function payAll() {
    if (!confirm(`Pay done for ${month}?\nAll active staff will be paid & period locked.\nCannot double-pay.`)) return;
    setPaying(true);
    const res = await fetch("/api/salary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "pay-all", periodStart, periodEnd }),
    });
    const data = await res.json();
    setPaying(false);
    if (data.ok) {
      toast.success(data.message || "Pay done!");
      load();
    } else toast.error(data.error || "Failed");
  }

  async function payOne(staffId: string, name: string) {
    if (!confirm(`Pay ${name} for ${month}?`)) return;
    setPaying(true);
    const res = await fetch("/api/salary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "pay-one", staffId, periodStart, periodEnd }),
    });
    const data = await res.json();
    setPaying(false);
    if (data.ok) {
      toast.success(`Paid ${name}`);
      load();
    } else toast.error(data.error || "Failed");
  }

  const fmt = (n: number) => (n ?? 0).toLocaleString("en-QA", { maximumFractionDigits: 0 });

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen pb-20">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <Link href="/" className="text-[#d4af37] font-bold">← Home</Link>
            <h1 className="text-xl font-bold">Salary · Pay Done</h1>
            <p className="text-xs text-slate-400">Period lock — double pay blocked</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <Link href={`/reports/monthly?from=${periodStart}&to=${periodEnd}`} className="px-3 py-2 rounded-lg glass text-sm">
              PDF Report
            </Link>
            <button
              onClick={payAll}
              disabled={paying || isPeriodLocked}
              className="btn-glow px-4 py-2 rounded-xl text-sm disabled:opacity-40"
            >
              {isPeriodLocked ? "✓ Period Locked" : paying ? "Paying..." : "Pay Done (All)"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Period</div>
            <div className="font-bold">{periodStart} → {periodEnd}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Net Payable</div>
            <div className="text-xl font-bold text-[#d4af37]">{fmt(totalNet)} QAR</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Already Paid</div>
            <div className="text-xl font-bold text-emerald-400">{fmt(totalPaid)} QAR</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Status</div>
            <div className={`font-bold ${isPeriodLocked ? "text-emerald-400" : "text-amber-400"}`}>
              {isPeriodLocked ? "LOCKED" : "Open"}
            </div>
          </div>
        </div>

        {loading && <p className="text-slate-400">Loading...</p>}

        <div className="glass rounded-2xl p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="pb-2 pr-2">Staff</th>
                <th className="pb-2 pr-2">Svc Comm</th>
                <th className="pb-2 pr-2">Prod Comm</th>
                <th className="pb-2 pr-2">Tips</th>
                <th className="pb-2 pr-2">Fixed</th>
                <th className="pb-2 pr-2">Cuts</th>
                <th className="pb-2 pr-2">Gross</th>
                <th className="pb-2 pr-2">Net</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => {
                const paid = paidMap[s.staffId];
                return (
                  <tr key={s.staffId} className="border-b border-white/5">
                    <td className="py-2.5 pr-2 font-medium">{s.staffName}</td>
                    <td className="pr-2">{fmt(s.serviceCommission)}</td>
                    <td className="pr-2">{fmt(s.productCommission)}</td>
                    <td className="pr-2">{fmt(s.tipsAmount)}</td>
                    <td className="pr-2">{fmt(s.fixedAmount)}</td>
                    <td className="pr-2 text-red-400">−{fmt(s.totalCuts)}</td>
                    <td className="pr-2">{fmt(s.grossEarnings)}</td>
                    <td className="pr-2 font-bold text-[#d4af37]">{fmt(s.netEarnings)}</td>
                    <td>
                      {paid ? (
                        <span className="text-xs text-emerald-400 font-semibold">✓ Paid {paid.date}</span>
                      ) : (
                        <button
                          onClick={() => payOne(s.staffId, s.staffName)}
                          disabled={paying}
                          className="text-xs px-2 py-1 rounded-lg bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30"
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {staffList.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No earnings this month. Complete bookings first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
