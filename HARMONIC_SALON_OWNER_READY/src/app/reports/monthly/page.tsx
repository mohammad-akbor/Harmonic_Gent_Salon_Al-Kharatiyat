"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

function ReportInner() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const from = searchParams.get("from") || new Date().toISOString().slice(0, 8) + "01";
  const to =
    searchParams.get("to") ||
    (() => {
      const d = new Date();
      return d.toISOString().slice(0, 10);
    })();

  const [pl, setPl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch(`/api/finance?mode=pl&from=${from}&to=${to}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) setPl(d.pl);
          setLoading(false);
        });
    }
  }, [status, from, to]);

  const fmt = (n: number) =>
    (n ?? 0).toLocaleString("en-QA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  if (status === "loading" || loading) {
    return <div className="p-10 text-center">Loading report...</div>;
  }

  if (!pl) {
    return <div className="p-10 text-center">No data. <Link href="/finance" className="text-[#d4af37]">Back</Link></div>;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Screen controls — hidden when printing */}
      <div className="print:hidden sticky top-0 bg-slate-900 text-white px-4 py-3 flex gap-3 items-center justify-between">
        <Link href="/finance" className="text-[#d4af37]">← Finance</Link>
        <span className="text-sm">Monthly Report {from} → {to}</span>
        <button
          onClick={() => window.print()}
          className="bg-[#d4af37] text-black font-bold px-4 py-2 rounded-lg"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8 print:p-4">
        <header className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-black tracking-wide">HARMONIC SALON</h1>
          <h2 className="text-lg font-semibold mt-1">MONTHLY MANAGEMENT REPORT</h2>
          <p className="text-sm mt-2">
            Report period: <b>{from}</b> to <b>{to}</b>
          </p>
          <p className="text-xs text-gray-600">
            Generated: {new Date().toLocaleString()} · Prepared by: {(session?.user as any)?.name || "Admin"}
          </p>
        </header>

        {/* 1. Income */}
        <section className="mb-6">
          <h3 className="font-bold text-base border-b border-gray-400 mb-2">1. INCOME (+)</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1">Service Sales</td><td className="text-right">{fmt(pl.income.serviceRevenue)} QAR</td></tr>
              <tr><td className="py-1">Product Sales</td><td className="text-right">{fmt(pl.income.productRevenue)} QAR</td></tr>
              <tr className="font-bold border-t border-gray-300"><td className="py-1">TOTAL REVENUE</td><td className="text-right">{fmt(pl.income.totalRevenue)} QAR</td></tr>
              <tr><td className="py-1 text-gray-600">Tips collected</td><td className="text-right">{fmt(pl.income.tipsCollected)} QAR</td></tr>
              <tr><td className="py-1 text-gray-600">Deductions retained (Penalty/Visa/etc)</td><td className="text-right">{fmt(pl.income.deductionsRetained)} QAR</td></tr>
              <tr><td className="py-1">Total Clients (SUM)</td><td className="text-right font-bold">{pl.clients.totalClients}</td></tr>
            </tbody>
          </table>
        </section>

        {/* 2. Costs */}
        <section className="mb-6">
          <h3 className="font-bold text-base border-b border-gray-400 mb-2">2. COSTS & PAYOUTS (−)</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1">Staff Commission (Service% + Product%)</td><td className="text-right">{fmt(pl.costs.totalCommission)} QAR</td></tr>
              <tr><td className="py-1">Tips paid to staff</td><td className="text-right">{fmt(pl.costs.tipsPaidToStaff)} QAR</td></tr>
              <tr><td className="py-1">Fixed Salaries</td><td className="text-right">{fmt(pl.costs.fixedSalaries)} QAR</td></tr>
              <tr><td className="py-1">Shop Expenses</td><td className="text-right">{fmt(pl.costs.expenses)} QAR</td></tr>
              <tr><td className="py-1">Product Purchases</td><td className="text-right">{fmt(pl.costs.purchases)} QAR</td></tr>
            </tbody>
          </table>
        </section>

        {/* 3. Deductions retained */}
        <section className="mb-6">
          <h3 className="font-bold text-base border-b border-gray-400 mb-2">3. DEDUCTIONS KEPT BY SALON (+)</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1">Penalty</td><td className="text-right">{fmt(pl.income.penaltyIncome)} QAR</td></tr>
              <tr><td className="py-1">Visa / Ticket Recovery</td><td className="text-right">{fmt(pl.income.visaIncome)} QAR</td></tr>
              <tr><td className="py-1">Advance Recovery</td><td className="text-right">{fmt(pl.income.advanceIncome)} QAR</td></tr>
              <tr><td className="py-1">Other Cuts</td><td className="text-right">{fmt(pl.income.otherIncome)} QAR</td></tr>
              <tr className="font-bold border-t"><td className="py-1">TOTAL DEDUCTIONS RETAINED</td><td className="text-right">{fmt(pl.income.deductionsRetained)} QAR</td></tr>
            </tbody>
          </table>
        </section>

        {/* Net Profit */}
        <section className="mb-6 p-4 border-2 border-black rounded">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold text-lg">NET PROFIT (after all payments)</div>
              <div className="text-xs text-gray-600 mt-1">{pl.profit.formula}</div>
            </div>
            <div className={`text-2xl font-black ${pl.profit.net >= 0 ? "text-green-700" : "text-red-700"}`}>
              {fmt(pl.profit.net)} QAR
            </div>
          </div>
        </section>

        {/* Staff performance */}
        <section className="mb-6">
          <h3 className="font-bold text-base border-b border-gray-400 mb-2">4. STAFF PERFORMANCE</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-400 text-left">
                <th className="py-1 pr-1">Staff</th>
                <th className="py-1 pr-1">Clients</th>
                <th className="py-1 pr-1">Service</th>
                <th className="py-1 pr-1">Product</th>
                <th className="py-1 pr-1">Gross</th>
                <th className="py-1 pr-1">Cuts</th>
                <th className="py-1">Net</th>
              </tr>
            </thead>
            <tbody>
              {(pl.staff?.list || []).map((s: any) => (
                <tr key={s.staffId} className="border-b border-gray-200">
                  <td className="py-1 pr-1">{s.staffName}</td>
                  <td className="pr-1">{s.totalClients}</td>
                  <td className="pr-1">{fmt(s.serviceSales)}</td>
                  <td className="pr-1">{fmt(s.productSales)}</td>
                  <td className="pr-1">{fmt(s.grossEarnings)}</td>
                  <td className="pr-1">−{fmt(s.totalCuts)}</td>
                  <td className="font-semibold">{fmt(s.netEarnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-sm flex gap-6">
            <span>Gross payable: <b>{fmt(pl.staff.grossPayable)} QAR</b></span>
            <span>Net payable all staff: <b>{fmt(pl.staff.netPayable)} QAR</b></span>
          </div>
        </section>

        {/* Daily customers */}
        {pl.clients?.dailyCustomers?.length > 0 && (
          <section className="mb-6">
            <h3 className="font-bold text-base border-b border-gray-400 mb-2">6. DAILY CUSTOMER COUNT</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1">Date</th>
                  <th className="py-1">Customers (SUM)</th>
                </tr>
              </thead>
              <tbody>
                {pl.clients.dailyCustomers.map((d: any) => (
                  <tr key={d.date} className="border-b border-gray-100">
                    <td className="py-0.5">{d.date}</td>
                    <td>{d.clients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-1">Month total = SUM all days (never divide by staff)</p>
          </section>
        )}

        <footer className="mt-10 pt-4 border-t border-gray-300 text-xs text-gray-600 flex justify-between">
          <span>Prepared by: Mohammad Akbor Ali</span>
          <span>Date: ____________ &nbsp; Signature: ____________</span>
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function MonthlyReportPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <ReportInner />
    </Suspense>
  );
}
