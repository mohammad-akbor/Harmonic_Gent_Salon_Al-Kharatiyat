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
  services?: { serviceName: string; price: number }[];
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount?: number;
  notes?: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"Cash" | "Card" | "Online" | "Mixed">("Cash");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [online, setOnline] = useState("");

  const role = (session?.user as any)?.role;
  const staffId = (session?.user as any)?.staffId;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (role === "staff" && staffId) params.set("staffId", staffId);
    const res = await fetch(`/api/bookings?${params}`);
    const data = await res.json();
    if (data.ok) setBookings(data.bookings || []);
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status, role]);

  async function setStatus(id: string, newStatus: string, payment?: object) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...payment }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success(
        newStatus === "completed"
          ? "Completed — your commission added to profile"
          : `Marked ${newStatus}`
      );
      setCompleteId(null);
      load();
    } else toast.error(data.error || "Failed");
  }

  function openComplete(b: Booking) {
    setCompleteId(b._id);
    setPayMethod("Cash");
    const total = b.totalAmount || 0;
    setCash(String(total));
    setCard("0");
    setOnline("0");
  }

  function confirmComplete() {
    if (!completeId) return;
    const payment = {
      paymentMethod: payMethod,
      cashAmount: Number(cash) || 0,
      cardAmount: Number(card) || 0,
      onlineAmount: Number(online) || 0,
    };
    setStatus(completeId, "completed", payment);
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <Link href="/" className="text-[#d4af37] font-bold">
              ← Home
            </Link>
            <h1 className="text-xl font-bold">Staff Dashboard</h1>
            <p className="text-xs text-slate-400">
              Complete = your % commission auto on profile · Cash/Card record
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {staffId && (
              <Link href={`/staff-profile?id=${staffId}`} className="text-sm text-[#d4af37]">
                My earnings
              </Link>
            )}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loading && <p className="text-slate-400">Loading...</p>}
        {!loading && bookings.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-slate-500">No bookings this date</div>
        )}
        {bookings.map((b) => (
          <div key={b._id} className="glass card-3d rounded-2xl p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-bold text-lg">{b.customerName}</div>
                <div className="text-sm text-slate-400">{b.customerPhone}</div>
                <div className="mt-2 text-[#d4af37]">
                  {b.services?.length
                    ? b.services.map((s) => s.serviceName).join(", ")
                    : b.serviceName}
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  {b.date} · {b.startTime} – {b.endTime} · {b.staffName}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                    b.status === "confirmed"
                      ? "bg-amber-500/20 text-amber-300"
                      : b.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-500/20 text-slate-400"
                  }`}
                >
                  {b.status}
                </span>
                {b.totalAmount ? (
                  <span className="text-[#d4af37] font-bold">{b.totalAmount} QAR</span>
                ) : null}
                {b.status === "confirmed" && (
                  <div className="flex gap-2 mt-1 flex-wrap justify-end">
                    <button
                      onClick={() => openComplete(b)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-sm font-medium"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => setStatus(b._id, "cancelled")}
                      className="px-3 py-1.5 rounded-lg bg-red-600/60 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {completeId === b._id && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="font-medium text-sm">Payment for {b.totalAmount || 0} QAR</div>
                <div className="flex flex-wrap gap-2">
                  {(["Cash", "Card", "Online", "Mixed"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setPayMethod(m);
                        const total = b.totalAmount || 0;
                        if (m === "Cash") {
                          setCash(String(total));
                          setCard("0");
                          setOnline("0");
                        } else if (m === "Card") {
                          setCash("0");
                          setCard(String(total));
                          setOnline("0");
                        } else if (m === "Online") {
                          setCash("0");
                          setCard("0");
                          setOnline(String(total));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        payMethod === m ? "bg-[#d4af37]/30 text-[#d4af37]" : "bg-white/5"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {payMethod === "Mixed" && (
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Cash"
                      value={cash}
                      onChange={(e) => setCash(e.target.value)}
                      className="px-2 py-1.5 rounded bg-slate-800 border border-white/10 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Card"
                      value={card}
                      onChange={(e) => setCard(e.target.value)}
                      className="px-2 py-1.5 rounded bg-slate-800 border border-white/10 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Online"
                      value={online}
                      onChange={(e) => setOnline(e.target.value)}
                      className="px-2 py-1.5 rounded bg-slate-800 border border-white/10 text-sm"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={confirmComplete} className="btn-glow px-4 py-2 rounded-lg text-sm">
                    Confirm Complete → commission
                  </button>
                  <button onClick={() => setCompleteId(null)} className="px-4 py-2 rounded-lg text-sm bg-white/10">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
