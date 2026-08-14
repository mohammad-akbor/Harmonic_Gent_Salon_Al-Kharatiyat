"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Booking = {
  _id: string;
  serviceName: string;
  services?: { serviceName: string }[];
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount?: number;
  staffId?: string;
  price?: number;
  customerPhone?: string;
};

const STATUS_UI: Record<string, { label: string; color: string; hint: string }> = {
  confirmed: {
    label: "CONFIRMED",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    hint: "Pending service — staff will complete after your visit",
  },
  completed: {
    label: "COMPLETED",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    hint: "Service finished",
  },
  cancelled: {
    label: "CANCELLED",
    color: "bg-red-500/20 text-red-300 border-red-500/40",
    hint: "This booking was cancelled",
  },
  no_show: {
    label: "NO SHOW",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    hint: "Marked as no-show",
  },
};

export default function MyBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/bookings?mine=1")
        .then((r) => r.json())
        .then((d) => d.ok && setBookings(d.bookings || []));
    }
  }, [status]);

  async function cancel(id: string) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success("Cancelled");
      setBookings((b) => b.map((x) => (x._id === id ? { ...x, status: "cancelled" } : x)));
    } else toast.error(data.error);
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-[#d4af37] font-bold">
            ← Home
          </Link>
          <h1 className="font-bold">My Bookings</h1>
          <Link href="/booking" className="text-sm text-[#d4af37]">
            + New
          </Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        <p className="text-xs text-slate-400 text-center">
          <span className="text-amber-300">CONFIRMED</span> = booked, waiting ·{" "}
          <span className="text-emerald-300">COMPLETED</span> = service done
        </p>
        {bookings.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-slate-400">No bookings yet.</div>
        )}
        {bookings.map((b) => {
          const ui = STATUS_UI[b.status] || STATUS_UI.confirmed;
          return (
            <div key={b._id} className="glass rounded-xl p-4 space-y-2">
              <div className="flex justify-between gap-3 items-start">
                <div>
                  <div className="font-medium text-[#d4af37]">
                    {b.services?.length
                      ? b.services.map((s) => s.serviceName).join(", ")
                      : b.serviceName}
                  </div>
                  <div className="text-sm text-slate-400">
                    {b.date} · {b.startTime}-{b.endTime} · {b.staffName}
                  </div>
                  {(b.totalAmount || b.price) != null && (
                    <div className="text-sm text-slate-300 mt-1">{b.totalAmount || b.price} QAR</div>
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${ui.color}`}>
                  {ui.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">{ui.hint}</p>
              {b.status === "confirmed" && (
                <button
                  onClick={() => cancel(b._id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Cancel booking
                </button>
              )}
              {b.status === "completed" && (b as any).staffId && (
                <button
                  type="button"
                  className="text-xs text-[#d4af37] hover:underline ml-2"
                  onClick={async () => {
                    const rating = Number(prompt("Rate staff 1-5 stars", "5") || "0");
                    if (rating < 1 || rating > 5) return;
                    const comment = prompt("Comment (optional)") || "";
                    const res = await fetch("/api/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        staffId: (b as any).staffId,
                        bookingId: b._id,
                        rating,
                        comment,
                      }),
                    });
                    const d = await res.json();
                    if (d.ok) toast.success("Review submitted");
                    else toast.error(d.error || "Failed");
                  }}
                >
                  ★ Review staff
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
