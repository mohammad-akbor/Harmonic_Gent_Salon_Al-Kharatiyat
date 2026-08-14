"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Product = {
  _id: string;
  name: string;
  sellPrice: number;
  category: string;
  stock: number;
  status: string;
};

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => d.ok && setProducts(d.products || []));
  }, []);

  return (
    <div className="min-h-screen pb-16">
<Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-center text-slate-400 mb-8 text-sm">
          Premium products · Sold out auto when stock = 0
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => {
            const soldOut = (p.stock ?? 0) <= 0 || p.status === "Inactive";
            return (
              <div
                key={p._id}
                className={`glass card-3d rounded-2xl p-5 relative ${soldOut ? "opacity-70" : ""}`}
              >
                {soldOut && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase bg-red-500/90 text-white px-2 py-1 rounded-lg z-10">
                    Sold Out
                  </span>
                )}
                <div className="h-28 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 mb-3 flex items-center justify-center text-4xl">
                  ✨
                </div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-slate-400">{p.category}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[#d4af37] font-bold">{p.sellPrice} QAR</span>
                  <span className={`text-xs ${soldOut ? "text-red-400" : "text-emerald-400"}`}>
                    {soldOut ? "Unavailable" : `Stock: ${p.stock}`}
                  </span>
                </div>
              </div>
            );
          })}
          {products.length === 0 && (
            <p className="col-span-full text-center text-slate-500 py-16">No products listed yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
