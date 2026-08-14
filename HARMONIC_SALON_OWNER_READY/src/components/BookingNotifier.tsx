"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  getClientRealtimeConfig,
  REALTIME_CHANNEL,
  EVENT_BOOKING,
} from "@/lib/realtime-client";

type Booking = {
  _id: string;
  customerName: string;
  customerPhone?: string;
  serviceName?: string;
  services?: { serviceName: string }[];
  staffName?: string;
  staffId?: string;
  date: string;
  startTime: string;
  status: string;
};

type Payload = {
  type: "created" | "updated" | "completed" | "cancelled";
  booking: Booking;
  at: string;
};

function playBell() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1174].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.25, now + 0.02 + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45 + i * 0.12);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + i * 0.1);
      o.stop(now + 0.6 + i * 0.1);
    });
  } catch {
    /* ignore */
  }
}

function serviceLabel(b: Booking) {
  if (b.services?.length) return b.services.map((s) => s.serviceName).join(", ");
  return b.serviceName || "Service";
}

/**
 * Realtime booking alerts (WebSocket via Pusher) + polling fallback.
 * Admin / Manager: all bookings
 * Staff: only own staffId
 */
export default function BookingNotifier() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const staffId = (session?.user as any)?.staffId as string | undefined;
  const allowed = role === "admin" || role === "manager" || role === "staff";

  const knownRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  const [banner, setBanner] = useState<{ booking: Booking; type: string } | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<"websocket" | "polling" | "off">("off");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  const requestPerm = useCallback(async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
  }, []);

  const showBrowser = useCallback((b: Booking, type: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const title =
        type === "created"
          ? "New booking — HARMONIC SALON"
          : type === "completed"
          ? "Booking completed"
          : type === "cancelled"
          ? "Booking cancelled"
          : "Booking updated";
      const n = new Notification(title, {
        body: `${b.customerName} · ${serviceLabel(b)} · ${b.startTime} · ${b.staffName || ""}`,
        tag: b._id + type,
      });
      n.onclick = () => {
        window.focus();
        window.location.href = "/dashboard";
        n.close();
      };
    } catch {
      /* ignore */
    }
  }, []);

  const handleEvent = useCallback(
    (payload: Payload) => {
      const b = payload.booking;
      if (!b?._id) return;
      // Staff only own bookings
      if (role === "staff" && staffId && b.staffId && String(b.staffId) !== String(staffId)) {
        return;
      }
      if (payload.type === "created") {
        if (knownRef.current.has(b._id)) return;
        knownRef.current.add(b._id);
        playBell();
        showBrowser(b, payload.type);
        setBanner({ booking: b, type: payload.type });
        setTimeout(() => {
          setBanner((cur) => (cur?.booking._id === b._id ? null : cur));
        }, 15000);
      } else if (payload.type === "completed" || payload.type === "cancelled") {
        playBell();
        showBrowser(b, payload.type);
        setBanner({ booking: b, type: payload.type });
        setTimeout(() => {
          setBanner((cur) => (cur?.booking._id === b._id ? null : cur));
        }, 10000);
      }
    },
    [role, staffId, showBrowser]
  );

  // ——— WebSocket (Pusher) ———
  useEffect(() => {
    if (!allowed || status !== "authenticated" || !enabled) return;
    const cfg = getClientRealtimeConfig();
    if (!cfg.enabled) return;

    let pusher: any = null;
    let cancelled = false;

    (async () => {
      try {
        const PusherJS = (await import("pusher-js")).default;
        if (cancelled) return;
        pusher = new PusherJS(cfg.key, { cluster: cfg.cluster, forceTLS: true });
        const ch = pusher.subscribe(REALTIME_CHANNEL);
        ch.bind(EVENT_BOOKING, (data: Payload) => {
          handleEvent(data);
        });
        setMode("websocket");
        readyRef.current = true;
      } catch (e) {
        console.warn("[realtime] pusher client failed", e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        pusher?.disconnect();
      } catch {
        /* */
      }
    };
  }, [allowed, status, enabled, handleEvent]);

  // ——— Polling fallback (if no Pusher key) ———
  useEffect(() => {
    if (!allowed || status !== "authenticated" || !enabled) return;
    const cfg = getClientRealtimeConfig();
    if (cfg.enabled) return; // websocket mode active

    setMode("polling");
    let cancelled = false;

    async function poll() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const params = new URLSearchParams({ date: today });
        if (role === "staff" && staffId) params.set("staffId", staffId);
        const res = await fetch(`/api/bookings?${params}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.ok || cancelled) return;
        const list: Booking[] = (data.bookings || []).filter(
          (b: Booking) => b.status === "confirmed" || b.status === "completed"
        );
        const ids = new Set(list.map((b) => b._id));
        if (!readyRef.current) {
          knownRef.current = ids;
          readyRef.current = true;
          return;
        }
        for (const b of list) {
          if (!knownRef.current.has(b._id) && b.status === "confirmed") {
            handleEvent({ type: "created", booking: b, at: new Date().toISOString() });
          }
        }
        knownRef.current = ids;
      } catch {
        /* */
      }
    }

    poll();
    const t = setInterval(poll, 12000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [allowed, status, enabled, role, staffId, handleEvent]);

  if (!allowed) return null;

  const titleMap: Record<string, string> = {
    created: "New booking",
    completed: "Completed",
    cancelled: "Cancelled",
    updated: "Updated",
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-[90] flex flex-col gap-2 max-w-xs">
        {perm !== "granted" && perm !== "unsupported" && (
          <button
            type="button"
            onClick={requestPerm}
            className="text-xs px-3 py-2 rounded-xl bg-[#d4af37] text-[#0b1220] font-semibold shadow-lg"
          >
            Enable browser notifications
          </button>
        )}
        <button
          type="button"
          onClick={() => setEnabled((e) => !e)}
          className="text-[10px] px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300 w-fit"
        >
          {enabled ? "🔔 Alerts ON" : "🔕 Alerts OFF"}
          {enabled && mode === "websocket" && " · Live WS"}
          {enabled && mode === "polling" && " · Poll"}
        </button>
      </div>

      {banner && (
        <div className="fixed top-4 right-4 z-[100] w-[min(100vw-2rem,360px)]">
          <div className="glass rounded-2xl border border-[#d4af37]/50 shadow-2xl p-4 ring-1 ring-[#d4af37]/30">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-[#d4af37] font-bold">
                  {titleMap[banner.type] || "Booking"}
                  {mode === "websocket" && " · Live"}
                </div>
                <div className="font-bold text-lg mt-0.5">{banner.booking.customerName}</div>
                <div className="text-sm text-slate-300 mt-1">{serviceLabel(banner.booking)}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {banner.booking.date} · {banner.booking.startTime}
                  {banner.booking.staffName ? ` · ${banner.booking.staffName}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => setBanner(null)} className="text-slate-400 text-xl px-1">
                ×
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <Link
                href="/dashboard"
                className="btn-glow flex-1 text-center py-2 rounded-xl text-sm"
                onClick={() => setBanner(null)}
              >
                Open dashboard
              </Link>
              <button type="button" onClick={() => setBanner(null)} className="px-3 py-2 rounded-xl bg-white/10 text-sm">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
