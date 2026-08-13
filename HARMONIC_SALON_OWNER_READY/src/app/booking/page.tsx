"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Staff = { _id: string; name: string; department: string };
type Service = { _id: string; name: string; price: number; durationMin: number; category: string };
type Slot = { time: string; available: boolean };

function BookingInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerArea: "",
    staffId: "",
    date: "",
    startTime: "",
    notes: "",
  });

  useEffect(() => {
    if (session?.user) {
      setForm((f) => ({
        ...f,
        customerName: session.user?.name || f.customerName,
        customerPhone: (session.user as any)?.phone || f.customerPhone,
      }));
    }
  }, [session]);

  useEffect(() => {
    fetch("/api/staff?bookable=1").then((r) => r.json()).then((d) => {
      if (d.ok) {
        setStaff(d.staff);
        const sid = searchParams.get("staff");
        if (sid) setForm((f) => ({ ...f, staffId: sid }));
      }
    });
    fetch("/api/services").then((r) => r.json()).then((d) => {
      if (d.ok) {
        setServices(d.services);
        const svc = searchParams.get("service");
        if (svc) setSelectedServices([svc]);
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (!form.staffId || !form.date) {
      setSlots([]);
      return;
    }
    fetch(`/api/slots?staffId=${form.staffId}&date=${form.date}`)
      .then((r) => r.json())
      .then((d) => d.ok && setSlots(d.slots));
  }, [form.staffId, form.date]);

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const cart = useMemo(() => {
    const items = services.filter((s) => selectedServices.includes(s._id));
    const totalPrice = items.reduce((a, s) => a + s.price, 0);
    const totalMin = items.reduce((a, s) => a + (s.durationMin || 30), 0);
    return { items, totalPrice, totalMin };
  }, [services, selectedServices]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedServices.length === 0) {
      toast.error("Select at least one service");
      return;
    }
    if (!form.startTime) {
      toast.error("Select a time slot");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          serviceIds: selectedServices,
          customerEmail: session?.user?.email,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || "Booking failed");
      } else {
        toast.success("Booking confirmed! " + (data.whatsapp?.ok ? "WhatsApp sent." : ""));
        setSelectedServices([]);
        setForm((f) => ({ ...f, startTime: "", notes: "" }));
        if (form.staffId && form.date) {
          const r = await fetch(`/api/slots?staffId=${form.staffId}&date=${form.date}`);
          const d = await r.json();
          if (d.ok) setSlots(d.slots);
        }
      }
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  }

  const byCategory = useMemo(() => {
    const map: Record<string, Service[]> = {};
    services.forEach((s) => {
      const c = s.category || "Other";
      if (!map[c]) map[c] = [];
      map[c].push(s);
    });
    return map;
  }, [services]);

  return (
    <div className="min-h-screen pb-20">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-[#d4af37]">← HARMONIC SALON</Link>
          <h1 className="font-semibold">Book Appointment</h1>
          <div className="w-24" />
        </div>
      </header>

      <form onSubmit={submit} className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[#d4af37] mb-4">1. Select Services (multiple OK)</h2>
          {Object.entries(byCategory).map(([cat, list]) => (
            <div key={cat} className="mb-4">
              <h3 className="text-sm text-slate-400 mb-2 uppercase tracking-wider">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((s) => {
                  const on = selectedServices.includes(s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => toggleService(s._id)}
                      className={`card-3d text-left p-4 rounded-xl border transition ${
                        on
                          ? "border-[#d4af37] bg-[#d4af37]/15 shadow-lg shadow-[#d4af37]/10"
                          : "border-white/10 hover:border-white/25 bg-slate-900/40"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{s.name}</span>
                        {on && <span className="text-[#d4af37] text-lg">✓</span>}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {s.durationMin} min · <span className="text-[#d4af37] font-semibold">{s.price} QAR</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {cart.items.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex flex-wrap gap-4 justify-between items-center">
              <div className="text-sm">
                <span className="font-semibold text-[#d4af37]">{cart.items.length} service(s)</span>
                <span className="text-slate-400"> · {cart.totalMin} min total</span>
              </div>
              <div className="text-xl font-bold text-[#d4af37]">{cart.totalPrice} QAR</div>
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#d4af37] mb-2">2. Staff, Date & Time</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Staff</label>
              <select
                required
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value, startTime: "" })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none"
              >
                <option value="">Select staff</option>
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, date: e.target.value, startTime: "" })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none"
              />
            </div>
          </div>

          {slots.length > 0 && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Available slots</label>
              <div className="flex flex-wrap gap-2">
                {slots.map((sl) => (
                  <button
                    key={sl.time}
                    type="button"
                    disabled={!sl.available}
                    onClick={() => setForm({ ...form, startTime: sl.time })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      form.startTime === sl.time
                        ? "bg-[#d4af37] text-[#0b1220]"
                        : sl.available
                        ? "bg-slate-800 border border-[#d4af37]/40 hover:bg-[#d4af37]/20 slot-free"
                        : "bg-slate-900/50 text-slate-600 cursor-not-allowed line-through"
                    }`}
                  >
                    {sl.time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#d4af37]">3. Your Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Name</label>
              <input
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Phone (WhatsApp)</label>
              <input
                required
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="974XXXXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-[#d4af37] outline-none resize-none"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={loading || selectedServices.length === 0}
          className="btn-glow w-full py-4 rounded-2xl text-lg disabled:opacity-50"
        >
          {loading ? "Booking..." : `Confirm Booking${cart.totalPrice ? ` · ${cart.totalPrice} QAR` : ""}`}
        </button>
      </form>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BookingInner />
    </Suspense>
  );
}
