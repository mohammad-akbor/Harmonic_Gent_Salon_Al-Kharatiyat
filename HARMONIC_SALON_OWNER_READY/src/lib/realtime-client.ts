/** Browser-side realtime config (public env only) */
export function getClientRealtimeConfig() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";
  return {
    enabled: !!key,
    key,
    cluster,
  };
}

export const REALTIME_CHANNEL = "harmonic-salon";
export const EVENT_BOOKING = "booking-event";
