"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Offer = {
  _id: string;
  title: string;
  description?: string;
  discountPercent?: number;
  discountAmount?: number;
  code?: string;
  imageUrl?: string;
  endDate?: string;
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    fetch("/api/offers")
      .then((r) => r.json())
      .then((d) => d.ok && setOffers(d.offers || []));
  }, []);

  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-center text-[#d4af37] mb-2">Special Offers</h1>
        <p className="text-center text-slate-400 text-sm mb-8">Limited deals · Book now</p>
        {offers.length === 0 && (
          <p className="text-center text-slate-500">No active offers right now</p>
        )}
        <div className="space-y-4">
          {offers.map((o) => (
            <div key={o._id} className="glass rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start">
              {o.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.imageUrl} alt="" className="w-full sm:w-40 h-28 object-cover rounded-xl" />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[#d4af37]">{o.title}</h2>
                {o.description && <p className="text-sm text-slate-300 mt-1">{o.description}</p>}
                <div className="flex flex-wrap gap-2 mt-3 text-sm">
                  {!!o.discountPercent && (
                    <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">
                      {o.discountPercent}% OFF
                    </span>
                  )}
                  {!!o.discountAmount && (
                    <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">
                      {o.discountAmount} QAR OFF
                    </span>
                  )}
                  {o.code && (
                    <span className="px-2 py-1 rounded bg-white/10 font-mono">Code: {o.code}</span>
                  )}
                  {o.endDate && <span className="text-xs text-slate-500">Until {o.endDate}</span>}
                </div>
                <Link href="/booking" className="inline-block mt-4 btn-glow px-5 py-2 rounded-xl text-sm">
                  Book now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
