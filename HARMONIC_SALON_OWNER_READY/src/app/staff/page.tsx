"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Staff = {
  _id: string;
  name: string;
  department: string;
  profilePicture?: string;
  status?: string;
};

export default function PublicStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => d.ok && setStaff((d.staff || []).filter((s: Staff) => s.status !== "Inactive")));
  }, []);

  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-center text-[#d4af37] mb-2">Our Team</h1>
        <p className="text-center text-slate-400 text-sm mb-8">Expert barbers & specialists</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {staff.map((s) => (
            <Link
              key={s._id}
              href={`/booking?staff=${s._id}`}
              className="glass card-3d rounded-2xl p-5 text-center hover:ring-1 hover:ring-[#d4af37]/40 transition"
            >
              {s.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.profilePicture} alt={s.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-[#d4af37]/40" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center text-2xl font-black text-[#0b1220] mx-auto mb-3">
                  {s.name.charAt(0)}
                </div>
              )}
              <h3 className="font-semibold">{s.name}</h3>
              <p className="text-xs text-slate-400">{s.department}</p>
              <span className="text-[11px] text-[#d4af37] mt-2 inline-block">Book →</span>
            </Link>
          ))}
        </div>
        {staff.length === 0 && <p className="text-center text-slate-500">Team coming soon</p>}
      </div>
    </div>
  );
}
