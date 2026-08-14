"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Product = {
  _id: string;
  name: string;
  stock: number;
  minStock?: number;
  sellPrice: number;
  costPrice?: number;
};

export default function InventoryPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [low, setLow] = useState<Product[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [expense, setExpense] = useState({
    title: "",
    category: "Other",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [purchase, setPurchase] = useState({
    productId: "",
    quantity: "",
    unitCost: "",
    date: new Date().toISOString().slice(0, 10),
    supplier: "",
  });

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

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...expense, amount: Number(expense.amount) }),
    });
    const d = await res.json();
    if (d.ok) {
      toast.success("Expense saved · shows in Finance P&L");
      setExpense({ title: "", category: "Other", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });
    } else toast.error(d.error || "Failed");
  }

  async function addPurchase(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: purchase.productId,
        quantity: Number(purchase.quantity),
        unitCost: Number(purchase.unitCost),
        date: purchase.date,
        supplier: purchase.supplier,
      }),
    });
    const d = await res.json();
    if (d.ok) {
      toast.success(`Purchase saved · stock now ${d.newStock}`);
      setPurchase({ productId: "", quantity: "", unitCost: "", date: new Date().toISOString().slice(0, 10), supplier: "" });
      load();
    } else toast.error(d.error || "Failed");
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <Link href="/admin" className="text-[#d4af37] font-bold">
              ← Admin
            </Link>
            <h1 className="text-xl font-bold">Inventory · Buy · Expenses</h1>
          </div>
          <Link href="/finance" className="text-sm text-emerald-300">
            Finance / P&L →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
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
            <strong>Low stock:</strong> {low.map((p) => p.name).join(", ")}
          </div>
        )}

        {/* Purchase = Buy stock */}
        <form onSubmit={addPurchase} className="glass rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-[#d4af37]">Buy / Purchase (stock in)</h2>
          <p className="text-xs text-slate-500">Increases stock · cost goes to Finance Purchases</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              required
              value={purchase.productId}
              onChange={(e) => setPurchase({ ...purchase, productId: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (stock {p.stock})
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="1"
              placeholder="Quantity"
              value={purchase.quantity}
              onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Unit cost QAR"
              value={purchase.unitCost}
              onChange={(e) => setPurchase({ ...purchase, unitCost: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="date"
              value={purchase.date}
              onChange={(e) => setPurchase({ ...purchase, date: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              placeholder="Supplier (optional)"
              value={purchase.supplier}
              onChange={(e) => setPurchase({ ...purchase, supplier: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 sm:col-span-2"
            />
          </div>
          <button type="submit" className="btn-glow px-6 py-2 rounded-xl">
            + Save purchase
          </button>
        </form>

        {/* Shop expense */}
        <form onSubmit={addExpense} className="glass rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-[#d4af37]">Shop Expense (rent, bill, etc.)</h2>
          <p className="text-xs text-slate-500">Reduces profit · shows in Finance Expenses</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              required
              placeholder="Title e.g. Shop rent"
              value={expense.title}
              onChange={(e) => setExpense({ ...expense, title: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <select
              value={expense.category}
              onChange={(e) => setExpense({ ...expense, category: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            >
              {["Rent", "Utility", "Salary", "Marketing", "Maintenance", "Supply", "Other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount QAR"
              value={expense.amount}
              onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              type="date"
              value={expense.date}
              onChange={(e) => setExpense({ ...expense, date: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
            <input
              placeholder="Notes"
              value={expense.notes}
              onChange={(e) => setExpense({ ...expense, notes: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 sm:col-span-2"
            />
          </div>
          <button type="submit" className="btn-glow px-6 py-2 rounded-xl">
            + Save expense
          </button>
        </form>

        {/* Stock table */}
        <div className="glass rounded-2xl p-5 overflow-x-auto">
          <h2 className="font-bold mb-3">Stock list</h2>
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
                      <button type="button" onClick={() => adjust(p._id, -1)} className="px-2 py-1 rounded bg-white/10 text-xs">
                        −1
                      </button>
                      <button type="button" onClick={() => adjust(p._id, 1)} className="px-2 py-1 rounded bg-white/10 text-xs">
                        +1
                      </button>
                      <button type="button" onClick={() => adjust(p._id, 10)} className="px-2 py-1 rounded bg-emerald-600/40 text-xs">
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
