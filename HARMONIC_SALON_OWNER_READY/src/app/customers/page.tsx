"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Customer = {
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

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/" className="text-[#d4af37] font-bold">
              ← Home
            </Link>
            <h1 className="text-xl font-bold">Customers by Area</h1>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Filter area e.g. Rayyan"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
            />
            <button
              onClick={() => load(areaFilter)}
              className="px-3 py-2 rounded-lg bg-[#d4af37]/20 text-[#d4af37] text-sm"
            >
              Filter
            </button>
            <button onClick={() => { setAreaFilter(""); load(); }} className="px-3 py-2 rounded-lg bg-white/10 text-sm">
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
                load(area === "Unknown" ? "" : area);
              }}
              className="glass rounded-xl p-4 text-left hover:border-[#d4af37]/40 border border-transparent"
            >
              <div className="font-bold text-[#d4af37]">{area}</div>
              <div className="text-xs text-slate-400">
                {v.count} customers · {v.visits} visits · {Math.round(v.spend)} QAR
              </div>
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="pb-2">Name</th>
                <th className="pb-2">Phone</th>
                <th className="pb-2">Area</th>
                <th className="pb-2">Visits</th>
                <th className="pb-2">Last</th>
                <th className="pb-2">Spend</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2 font-medium">{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.area || "—"}</td>
                  <td>{c.visits}</td>
                  <td>{c.lastVisit || "—"}</td>
                  <td>{Math.round(c.totalSpend)} QAR</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No customers
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
