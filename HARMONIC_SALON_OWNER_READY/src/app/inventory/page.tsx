"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Product = {
  _id: string;
  name: string;
  category: string;
  stock: number;
  minStock?: number;
  sellPrice: number;
  costPrice: number;
  status: string;
};

export default function InventoryPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [low, setLow] = useState<Product[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !["admin", "manager"].includes((session?.user as any)?.role)) {
      toast.error("Admin only");
      router.push("/");
    }
  }, [status, session, router]);

  async function load() {
    const res = await fetch("/api/inventory");
    const data = await res.json();
    if (data.ok) {
      setProducts(data.products || []);
      setLow(data.lowStock || []);
      setSummary(data.summary);
    }
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  async function adjust(id: string, delta: number) {
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id, delta }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success(`Stock → ${data.product.stock}`);
      load();
    } else toast.error(data.error);
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <Link href="/" className="text-[#d4af37] font-bold">
              ← Home
            </Link>
            <h1 className="text-xl font-bold">Inventory</h1>
          </div>
          <Link href="/admin" className="text-sm text-[#d4af37]">
            Admin products
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-slate-400">Items</div>
              <div className="text-2xl font-bold">{summary.items}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-slate-400">Low stock</div>
              <div className="text-2xl font-bold text-red-400">{summary.lowStockCount}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-slate-400">Stock value (cost)</div>
              <div className="text-xl font-bold">{Math.round(summary.stockValueCost)} QAR</div>
            </div>
          </div>
        )}

        {low.length > 0 && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
            <strong>Low stock alert:</strong> {low.map((p) => p.name).join(", ")}
          </div>
        )}

        <div className="glass rounded-2xl p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="pb-2">Product</th>
                <th className="pb-2">Stock</th>
                <th className="pb-2">Min</th>
                <th className="pb-2">Sell</th>
                <th className="pb-2">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = (p.stock || 0) <= (p.minStock ?? 5);
                return (
                  <tr key={p._id} className="border-b border-white/5">
                    <td className="py-2 font-medium">
                      {p.name}
                      {isLow && <span className="ml-2 text-[10px] text-red-400">LOW</span>}
                    </td>
                    <td className={isLow ? "text-red-400 font-bold" : ""}>{p.stock}</td>
                    <td>{p.minStock ?? 5}</td>
                    <td>{p.sellPrice} QAR</td>
                    <td className="space-x-1">
                      <button onClick={() => adjust(p._id, -1)} className="px-2 py-1 rounded bg-white/10 text-xs">
                        −1
                      </button>
                      <button onClick={() => adjust(p._id, 1)} className="px-2 py-1 rounded bg-white/10 text-xs">
                        +1
                      </button>
                      <button onClick={() => adjust(p._id, 10)} className="px-2 py-1 rounded bg-emerald-600/40 text-xs">
                        +10
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
