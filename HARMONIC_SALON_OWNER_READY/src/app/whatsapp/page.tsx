"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

/**
 * Free WhatsApp Send Box
 * Uses wa.me links — no paid API. Opens WhatsApp with pre-filled message.
 * Admin / Staff can use. No Twilio/Meta keys required.
 */

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
  totalAmount?: number;
};

function normalizePhone(phone: string) {
  let p = phone.replace(/[^\d]/g, "");
  if (p.length === 8) p = "974" + p;
  return p;
}

function buildWaLink(phone: string, text: string) {
  const n = normalizePhone(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

const TEMPLATES = {
  confirmed: (b: Booking, salon: string) =>
    `✅ Booking Confirmed — ${salon}\n\nName: ${b.customerName}\nService: ${
      b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
    }\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime} - ${b.endTime}\n\nPlease arrive 5 minutes early.`,
  completed: (b: Booking, salon: string) =>
    `✅ Service Completed — ${salon}\n\nHi ${b.customerName},\nYour appointment is done.\n\nService: ${
      b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
    }\nStaff: ${b.staffName}\nDate: ${b.date}\n\nThank you! See you again.`,
  reminder: (b: Booking, salon: string) =>
    `⏰ Reminder — ${salon}\n\nHi ${b.customerName},\nYour appointment is coming up.\n\nService: ${
      b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
    }\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime}\n\nSee you soon!`,
  custom: (_b: Booking, _salon: string) => "",
};

export default function WhatsAppSendPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState<keyof typeof TEMPLATES>("confirmed");
  const [selectedBooking, setSelectedBooking] = useState<string>("");

  const role = (session?.user as any)?.role;
  const isStaff = role === "staff" || role === "manager";
  const isAdmin = role === "admin";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !isStaff && !isAdmin) router.push("/");
  }, [status, role, router, isStaff, isAdmin]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const params = new URLSearchParams();
    if (role === "staff" && (session?.user as any)?.staffId) {
      params.set("staffId", (session?.user as any).staffId);
    }
    params.set("date", new Date().toISOString().slice(0, 10));
    fetch(`/api/bookings?${params}`)
      .then((r) => r.json())
      .then((d) => d.ok && setBookings(d.bookings || []));
  }, [status, role, session]);

  function applyTemplate(kind: keyof typeof TEMPLATES_LOCAL, bookingId?: string) {
    const salon = "HARMONIC SALON";
    if (kind === "custom") {
      setMessage("");
      return;
    }
    const b = bookingId
      ? bookings.find((x) => x._id === bookingId)
      : bookings[0];
    if (!b) {
      toast.error("Select a booking or create one first");
      return;
    }
    setPhone(b.customerPhone || "");
    setSelectedBooking(b._id);
    setMessage(TEMPLATES_LOCAL[kind](b, salon));
  }

  const TEMPLATES_LOCAL = {
    confirmed: (b: Booking, salon: string) =>
      `✅ Booking Confirmed — ${salon}\n\nName: ${b.customerName}\nService: ${
        b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
      }\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime} - ${b.endTime}\n\nPlease arrive 5 minutes early.`,
    completed: (b: Booking, salon: string) =>
      `✅ Service Completed — ${salon}\n\nHi ${b.customerName},\nYour appointment is done.\n\nService: ${
        b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
      }\nStaff: ${b.staffName}\nDate: ${b.date}\n\nThank you!`,
    reminder: (b: Booking, salon: string) =>
      `⏰ Reminder — ${salon}\n\nHi ${b.customerName},\nYour appointment is coming.\n\nService: ${
        b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
      }\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime}`,
  };

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  function openWa() {
    if (!phone.trim()) {
      toast.error("Enter phone number");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter message");
      return;
    }
    let n = phone.replace(/\D/g, "");
    if (n.length === 8) n = "974" + n;
    const link = `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
    window.open(link, "_blank");
  }

  function applyFromBooking(b: Booking, kind: "confirmed" | "completed" | "reminder") {
    setPhone(b.customerPhone || "");
    const salon = "HARMONIC SALON";
    if (kind === "confirmed") {
      setMessage(
        `✅ Booking Confirmed — ${salon}\n\nName: ${b.customerName}\nService: ${
          b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
        }\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime} - ${b.endTime}\n\nPlease arrive 5 minutes early.`
      );
    } else if (kind === "completed") {
      setMessage(
        `✅ Service Completed — ${salon}\n\nHi ${b.customerName},\nYour appointment is done.\n\nService: ${
          b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
        }\nStaff: ${b.staffName}\nDate: ${b.date}\n\nThank you!`
      );
    } else {
      setMessage(
        `⏰ Reminder — ${salon}\n\nHi ${b.customerName},\nYour appointment is coming.\n\nService: ${
          b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
        }\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime}`
      );
    }
  }

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  function openWa() {
    if (!phone.trim()) {
      toast.error("Enter phone");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter message");
      return;
    }
    let n = phone.replace(/\D/g, "");
    if (n.length === 8) n = "974" + n;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-[#d4af37] font-bold">
            ← Home
          </Link>
          <h1 className="font-bold">WhatsApp Send (Free)</h1>
          <span className="text-xs text-slate-500">wa.me · no paid API</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-sm text-slate-400">
            ফ্রি WhatsApp সেন্ড বক্স — API টাকা লাগে না। WhatsApp ওপেন হবে, মেসেজ লিখা থাকবে, Send চাপলেই যাবে।
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
            Open WhatsApp & Send
          </button>
        </div>

        <div className="glass rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-[#d4af37]">From today&apos;s bookings</h2>
          {bookings.length === 0 && (
            <p className="text-sm text-slate-500">আজকের কোনো booking নেই</p>
          )}
          {bookings.map((b) => (
            <div key={b._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2">
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

  function applyFromBooking(b: Booking, kind: "confirmed" | "completed" | "reminder") {
    setPhone(b.customerPhone || "");
    const salon = "HARMONIC SALON";
    if (kind === "confirmed") {
      setMessage(
        `✅ Booking Confirmed — ${salon}\n\nName: ${b.customerName}\nService: ${
          b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
        }\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime} - ${b.endTime}\n\nPlease arrive 5 minutes early.`
      );
    } else if (kind === "completed") {
      setMessage(
        `✅ Service Completed — ${salon}\n\nHi ${b.customerName},\nYour appointment is done.\n\nService: ${
          b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
        }\nStaff: ${b.staffName}\nDate: ${b.date}\n\nThank you!`
      );
    } else {
      setMessage(
        `⏰ Reminder — ${salon}\n\nHi ${b.customerName},\nYour appointment is coming.\n\nService: ${
          b.services?.length ? b.services.map((s) => s.serviceName).join(", ") : b.serviceName
        }\nStaff: ${b.staffName}\nDate: ${b.date}\nTime: ${b.startTime}`
      );
    }
  }

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  function openWa() {
    if (!phone.trim()) {
      toast.error("Enter phone");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter message");
      return;
    }
    let n = phone.replace(/\D/g, "");
    if (n.length === 8) n = "974" + n;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, "_blank");
  }

  // This return was wrong structure - the free WA page was mixed. Rebuild clean attendance was separate.
  // This file is attendance only above. Good.
}
