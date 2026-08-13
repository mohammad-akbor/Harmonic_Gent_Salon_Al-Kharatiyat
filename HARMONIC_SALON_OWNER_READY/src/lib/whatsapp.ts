/**
 * WhatsApp notifications for bookings
 *
 * Auto-send when:
 *  - Customer books → CONFIRMED message
 *  - Staff completes → COMPLETED message
 *  - Cancelled → CANCELLED message
 *
 * Env (.env.local):
 *  WHATSAPP_PROVIDER=twilio | meta | off
 *  Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 *  Meta:   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
 *
 * If keys missing → returns waLink (wa.me) so UI can open WhatsApp manually.
 */

export type BookingNotifyKind = "confirmed" | "completed" | "cancelled";

export type BookingMsg = {
  toPhone: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  date: string;
  time: string;
  status?: BookingNotifyKind;
  totalAmount?: number;
  salonName?: string;
};

function normalizePhone(phone: string) {
  let p = phone.replace(/[^\d]/g, "");
  // Qatar local 8-digit → add 974
  if (p.length === 8) p = "974" + p;
  return p;
}

function buildText(msg: BookingMsg): string {
  const salon = msg.salonName || process.env.SALON_NAME || "HARMONIC SALON";
  const kind = msg.status || "confirmed";
  const amount = msg.totalAmount != null ? `\nAmount: ${msg.totalAmount} QAR` : "";

  if (kind === "completed") {
    return (
      `✅ Service COMPLETED — ${salon}\n\n` +
      `Hi ${msg.customerName},\n` +
      `Your appointment is done.\n\n` +
      `Service: ${msg.serviceName}\n` +
      `Staff: ${msg.staffName}\n` +
      `Date: ${msg.date} ${msg.time}` +
      amount +
      `\n\nThank you! See you again.`
    );
  }
  if (kind === "cancelled") {
    return (
      `❌ Booking CANCELLED — ${salon}\n\n` +
      `Hi ${msg.customerName},\n` +
      `Service: ${msg.serviceName}\n` +
      `Staff: ${msg.staffName}\n` +
      `Date: ${msg.date} ${msg.time}\n\n` +
      `You can book again anytime.`
    );
  }
  // confirmed (pending service until staff completes)
  return (
    `📅 Booking CONFIRMED — ${salon}\n\n` +
    `Hi ${msg.customerName},\n` +
    `Status: CONFIRMED (waiting for service)\n\n` +
    `Service: ${msg.serviceName}\n` +
    `Staff: ${msg.staffName}\n` +
    `Date: ${msg.date}\n` +
    `Time: ${msg.time}` +
    amount +
    `\n\nPlease arrive 5 minutes early.\n` +
    `When staff finishes, status becomes COMPLETED.`
  );
}

/** Public wa.me link — works without API keys */
export function getWhatsAppLink(msg: BookingMsg): string {
  const phone = normalizePhone(msg.toPhone);
  const text = encodeURIComponent(buildText(msg));
  return `https://wa.me/${phone}?text=${text}`;
}

export async function sendBookingWhatsApp(
  msg: BookingMsg
): Promise<{ ok: boolean; error?: string; waLink?: string }> {
  const text = buildText(msg);
  const waLink = getWhatsAppLink(msg);
  const provider = (process.env.WHATSAPP_PROVIDER || "off").toLowerCase();

  if (provider === "off" || provider === "") {
    console.warn("WhatsApp PROVIDER=off — booking saved; use waLink for manual send");
    return { ok: false, error: "WhatsApp auto-send off (set WHATSAPP_PROVIDER=twilio or meta)", waLink };
  }

  try {
    if (provider === "twilio") {
      const r = await sendViaTwilio(msg.toPhone, text);
      return { ...r, waLink };
    }
    if (provider === "meta") {
      const r = await sendViaMeta(msg.toPhone, text);
      return { ...r, waLink };
    }
    return { ok: false, error: `Unknown WHATSAPP_PROVIDER=${provider}`, waLink };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : "WhatsApp send failed";
    console.error("WhatsApp error:", err);
    return { ok: false, error: err, waLink };
  }
}

async function sendViaMeta(toPhone: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    return { ok: false, error: "Meta WhatsApp keys missing" };
  }
  const to = normalizePhone(toPhone);
  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

async function sendViaTwilio(toPhone: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // whatsapp:+14155238886
  if (!sid || !auth || !from) {
    return { ok: false, error: "Twilio WhatsApp keys missing" };
  }
  const to = `whatsapp:+${normalizePhone(toPhone)}`;
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${auth}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}
