"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Row = {
  _id: string;
  staffName: string;
  date: string;
  checkInAt: string;
  checkOutAt?: string;
  hoursWorked: number;
  status: string;
};

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [list, setList] = useState<Row[]>([]);
  const [open, setOpen] = useState<Row | null>(null);
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function load() {
    const res = await fetch(`/api/attendance?date=${date}`);
    const data = await res.json();
    if (data.ok) {
      setList(data.attendance || []);
      const mine = (data.attendance || []).find((a: Row) => a.status === "Open");
      setOpen(mine || null);
    }
  }

  useEffect(() => {
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, date]);

  async function checkIn() {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check-in" }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success("Checked in");
      load();
    } else toast.error(data.error);
  }

  async function checkOut() {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check-out" }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success(data.message || "Checked out");
      load();
    } else toast.error(data.error);
  }

  const fmt = (d?: string) => (d ? new Date(d).toLocaleTimeString("en-QA", { hour: "2-digit", minute: "2-digit" }) : "—");

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/" className="text-[#d4af37] font-bold">
              ← Home
            </Link>
            <h1 className="text-xl font-bold">Staff Attendance</h1>
            <p className="text-xs text-slate-400">Check-in / Check-out tracking</p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
          />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {(role === "staff" || role === "admin") && (
          <div className="glass rounded-2xl p-5 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <div className="font-medium">Today status</div>
              <div className="text-sm text-slate-400">
                {open ? `Checked in at ${fmt(open.checkInAt)}` : "Not checked in"}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={checkIn}
                disabled={!!open}
                className="btn-glow px-4 py-2 rounded-xl text-sm disabled:opacity-40"
              >
                Check In
              </button>
              <button
                onClick={checkOut}
                disabled={!open}
                className="px-4 py-2 rounded-xl text-sm bg-white/10 disabled:opacity-40"
              >
                Check Out
              </button>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="pb-2">Staff</th>
                <th className="pb-2">In</th>
                <th className="pb-2">Out</th>
                <th className="pb-2">Hours</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a._id} className="border-b border-white/5">
                  <td className="py-2 font-medium">{a.staffName}</td>
                  <td>{fmt(a.checkInAt)}</td>
                  <td>{fmt(a.checkOutAt)}</td>
                  <td>{a.hoursWorked || "—"}</td>
                  <td>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        a.status === "Open" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-600"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No attendance records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
