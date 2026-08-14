"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Staff = { _id: string; name: string; department: string; branchId?: string };
type Service = { _id: string; name: string; price: number; durationMin: number; category: string };
type Slot = { time: string; available: boolean };

function BookingInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ _id: string; name: string; city?: string; address?: string }[]>([]);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerArea: "",
    branchId: "",
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
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setBranches(d.branches || []);
      })
      .catch(() => {});
    fetch("/api/staff?bookable=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const list = d.staff || [];
          setAllStaff(list);
          setStaff(list);
          const sid = searchParams.get("staff");
          if (sid) setForm((f) => ({ ...f, staffId: sid }));
        }
      })
      .catch(() => {});
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setServices(d.services || []);
          const svc = searchParams.get("service");
          if (svc) setSelectedServices([svc]);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    if (!form.staffId || !form.date) {
      setSlots([]);
      return;
    }
    fetch(`/api/slots?staffId=${form.staffId}&date=${form.date}`)
      .then((r) => r.json())
      .then((d) => d.ok && setSlots(d.slots || []));
  }, [form.staffId, form.date]);

  useEffect(() => {
    if (!form.branchId) {
      setStaff(allStaff);
      return;
    }
    setStaff(
      allStaff.filter((s) => !s.branchId || String(s.branchId) === form.branchId)
    );
  }, [form.branchId, allStaff]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedServices.length === 0) {
      toast.error("Select at least one service");
      return;
    }
    if (!form.staffId || !form.date || !form.startTime) {
      toast.error("Select staff, date and time");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerArea: form.customerArea,
          staffId: form.staffId,
          branchId: form.branchId || undefined,
          date: form.date,
          startTime: form.startTime,
          notes: form.notes,
          serviceIds: selectedServices,
          customerId: (session?.user as any)?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Booking confirmed!");
        setForm((f) => ({ ...f, startTime: "", notes: "" }));
        setSelectedServices([]);
        if (form.staffId && form.date) {
          const r = await fetch(`/api/slots?staffId=${form.staffId}&date=${form.date}`);
          const sd = await r.json();
          if (sd.ok) setSlots(sd.slots || []);
        }
      } else {
        toast.error(data.error || "Booking failed");
      }
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-[#d4af37] font-bold">
            ← Home
          </Link>
          <h1 className="font-bold text-lg">Book Appointment</h1>
          <Link href="/my-bookings" className="text-sm text-slate-400">
            My bookings
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#d4af37]">1. Location & Staff</h2>

          {branches.length > 0 && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Branch / Location</label>
              <select
                value={form.branchId}
                onChange={(e) =>
                  setForm({ ...form, branchId: e.target.value, staffId: "", startTime: "" })
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
              >
                <option value="">All locations</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                    {b.city ? ` · ${b.city}` : ""}
                    {b.address ? ` · ${b.address}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Staff</label>
            <select
              required
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value, startTime: "" })}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            >
              <option value="">Select staff</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} · {s.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Date</label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value, startTime: "" })}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            />
          </div>
        </section>

        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#d4af37]">2. Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {services.map((s) => {
              const on = selectedServices.includes(s._id);
              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => toggleService(s._id)}
                  className={`text-left px-4 py-3 rounded-xl border transition ${
                    on
                      ? "border-[#d4af37] bg-[#d4af37]/15"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-400">
                    {s.durationMin || 30} min · {s.price} QAR
                  </div>
                </button>
              );
            })}
          </div>
          {cart.totalPrice > 0 && (
            <p className="text-sm text-[#d4af37]">
              Selected: {cart.items.length} · {cart.totalMin} min · {cart.totalPrice} QAR
            </p>
          )}
        </section>

        {form.staffId && form.date && (
          <section className="glass rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#d4af37]">3. Time slot</h2>
            <div className="flex flex-wrap gap-2">
              {slots.length === 0 && (
                <p className="text-sm text-slate-500">No slots / loading...</p>
              )}
              {slots.map((sl) => (
                <button
                  key={sl.time}
                  type="button"
                  disabled={!sl.available}
                  onClick={() => setForm({ ...form, startTime: sl.time })}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    form.startTime === sl.time
                      ? "bg-[#d4af37] text-[#0b1220] font-bold"
                      : sl.available
                      ? "bg-white/10 hover:bg-[#d4af37]/20"
                      : "bg-slate-900/50 text-slate-600 cursor-not-allowed line-through"
                  }`}
                >
                  {sl.time}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#d4af37]">4. Your details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Name</label>
              <input
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Phone</label>
              <input
                required
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="974XXXXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Area (optional)</label>
            <input
              value={form.customerArea}
              onChange={(e) => setForm({ ...form, customerArea: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 resize-none"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={loading || selectedServices.length === 0}
          className="btn-glow w-full py-4 rounded-2xl text-lg disabled:opacity-50"
        >
          {loading
            ? "Booking..."
            : `Confirm Booking${cart.totalPrice ? ` · ${cart.totalPrice} QAR` : ""}`}
        </button>
      </form>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">Loading...</div>
      }
    >
      <BookingInner />
    </Suspense>
  );
}