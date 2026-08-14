"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/gallery", label: "Gallery" },
  { href: "/store", label: "Store" },
  { href: "/staff", label: "Staff" },
  { href: "/offers", label: "Offers" },
  { href: "/booking", label: "Book" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname() || "";
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const active =
    href === "/"
      ? path === "/"
      : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={
        active
          ? "px-3 py-1.5 rounded-lg text-sm font-bold bg-[#d4af37] text-[#0b1220] shadow-md ring-2 ring-[#d4af37]/50"
          : "px-3 py-1.5 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition"
      }
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "admin";
  const isStaff = role === "staff" || role === "manager";
  const isCustomer = role === "customer";
  const pic = (session?.user as any)?.profilePicture;

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center font-black text-[#0b1220] text-lg shadow-lg">
            H
          </div>
          <span className="font-bold text-lg tracking-wide hidden sm:inline">HARMONIC SALON</span>
        </Link>

        {/* Public nav — always visible */}
        <nav className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center flex-1">
          {publicLinks.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
        </nav>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {session ? (
            <>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10"
                title="Profile & photo"
              >
                {pic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pic} alt="" className="w-8 h-8 rounded-full object-cover border border-[#d4af37]/50" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#d4af37]/30 flex items-center justify-center text-xs font-bold text-[#d4af37]">
                    {(session.user?.name || session.user?.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>

              {/* Separate dashboards by role */}
              {isAdmin && (
                <>
                  <NavLink href="/dashboard" label="Dashboard" />
                  <NavLink href="/admin" label="Admin" />
                  <NavLink href="/finance" label="Finance" />
                  <NavLink href="/inventory" label="Inventory" />
                </>
              )}
              {isStaff && (
                <>
                  <NavLink href="/dashboard" label="Dashboard" />
                  <NavLink href="/attendance" label="Attendance" />
                </>
              )}
              {isCustomer && <NavLink href="/my-bookings" label="My Bookings" />}

              <Link href="/settings" className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm">
                Settings
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Public: only Customer login/register */}
              <Link href="/login" className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm">
                Login
              </Link>
              <Link href="/register" className="btn-glow px-4 py-1.5 rounded-lg text-sm">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
