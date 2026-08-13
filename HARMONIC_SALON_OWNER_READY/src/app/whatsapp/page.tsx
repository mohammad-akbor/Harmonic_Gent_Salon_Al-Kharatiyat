"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Booking = {
  _id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  services?: { serviceName: string }[];
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

function normalizePhone(phone: string) {
  let p = phone.replace(/[^\d]/g, "");
  if (p.length === 8) p = "974" + p;
  return p;
}

export default function WhatsAppSendPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const role = (session?.user as any)?.role;
  const allowed = role === "admin" || role === "manager" || role === "staff";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!allowed) return;
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/bookings?date=${today}`)
      .then((r) => r.json())
      .then((d) => d.ok && setBookings(d.bookings || []))
      .catch(() => {});
  }, [allowed]);

  function openWa() {
    if (!phone.trim()) {
      toast.error("Enter phone");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter message");
      return;
    }
    const n = normalizePhone(phone);
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, "_blank");
  }

  function applyFromBooking(b: Booking, kind: "confirmed" | "completed" | "reminder") {
    setPhone(b.customerPhone || "");
    const salon = "HARMONIC SALON";
    const svc = b.services?.length
      ? b.services.map((s) => s.serviceName).join(", ")
      : b.serviceName;

    if (kind === "confirmed") {
      setMessage(
        `Booking Confirmed — ${salon}\n\nName: ${b.customerName}\nService: ${svc}\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime} - ${b.endTime}\n\nPlease arrive 5 minutes early.`
      );
    } else if (kind === "completed") {
      setMessage(
        `Service Completed — ${salon}\n\nHi ${b.customerName},\nYour appointment is done.\n\nService: ${svc}\nStaff: ${b.staffName}\nDate: ${b.date}\n\nThank you!`
      );
    } else {
      setMessage(
        `Reminder — ${salon}\n\nHi ${b.customerName},\nYour appointment is coming.\n\nService: ${svc}\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime}`
      );
    }
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Admin / Staff only</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-[#d4af37] font-bold">
            ← Home
          </Link>
          <h1 className="font-bold text-lg">WhatsApp Send</h1>
          <span className="text-xs text-slate-500">Free wa.me</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-sm text-slate-400">
            Free WhatsApp box — no API cost. Opens WhatsApp with message ready to send.
          </p>
          <div>
            <label className="text-xs text-slate-400">Phone (+974…)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="97477064447"
              className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10 font-mono text-sm"
            />
          </div>
          <button type="button" onClick={openWa} className="btn-glow w-full py-3 rounded-xl">
            Open WhatsApp and Send
          </button>
        </div>

        <div className="glass rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-[#d4af37]">From today&apos;s bookings</h2>
          {bookings.length === 0 && (
            <p className="text-sm text-slate-500">No bookings today</p>
          )}
          {bookings.map((b) => (
            <div
              key={b._id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2"
            >
              <div className="text-sm">
                <span className="font-medium">{b.customerName}</span>
                <span className="text-slate-400 ml-2">{b.customerPhone}</span>
                <span className="text-slate-500 ml-2">{b.status}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyFromBooking(b, "confirmed")}
                  className="text-xs px-2 py-1 rounded bg-white/10"
                >
                  Confirm msg
                </button>
                <button
                  type="button"
                  onClick={() => applyFromBooking(b, "completed")}
                  className="text-xs px-2 py-1 rounded bg-white/10"
                >
                  Complete msg
                </button>
                <button
                  type="button"
                  onClick={() => applyFromBooking(b, "reminder")}
                  className="text-xs px-2 py-1 rounded bg-white/10"
                >
                  Reminder
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}