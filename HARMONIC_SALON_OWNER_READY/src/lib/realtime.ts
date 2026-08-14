/**
 * Realtime layer (WebSocket via Pusher Channels)
 *
 * Free tier: https://pusher.com → create Channels app
 * Env (Vercel + .env.local):
 *   NEXT_PUBLIC_PUSHER_KEY=
 *   NEXT_PUBLIC_PUSHER_CLUSTER=ap2   (or mt1, eu, etc.)
 *   PUSHER_APP_ID=
 *   PUSHER_SECRET=
 *
 * If env missing → publish is no-op; client falls back to polling.
 */

import Pusher from "pusher";

export const REALTIME_CHANNEL = "harmonic-salon";
export const EVENT_BOOKING = "booking-event";

export type BookingRealtimePayload = {
  type: "created" | "updated" | "completed" | "cancelled";
  booking: {
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
    totalAmount?: number;
  };
  at: string;
};

let server: Pusher | null = null;

function getServer(): Pusher | null {
  if (server) return server;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";
  if (!appId || !key || !secret) return null;
  server = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  return server;
}

export function isRealtimeConfigured(): boolean {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET
  );
}

export async function publishBookingEvent(payload: BookingRealtimePayload): Promise<boolean> {
  try {
    const p = getServer();
    if (!p) return false;
    await p.trigger(REALTIME_CHANNEL, EVENT_BOOKING, payload);
    return true;
  } catch (e) {
    console.error("[realtime] publish failed", e);
    return false;
  }
}
