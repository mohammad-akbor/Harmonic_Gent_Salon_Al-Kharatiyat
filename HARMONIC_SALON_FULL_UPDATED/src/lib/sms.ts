/**
 * SMS Notifications (Twilio SMS — not WhatsApp)
 *
 * .env.local:
 *   SMS_PROVIDER=twilio
 *   TWILIO_ACCOUNT_SID=ACxxxx
 *   TWILIO_AUTH_TOKEN=xxxx
 *   TWILIO_SMS_FROM=+1xxxxxxxxxx   (Twilio phone number)
 *
 * Or SMS_PROVIDER=off to disable
 */

export type SmsResult = { ok: boolean; error?: string; sid?: string };

function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) return p;
  const digits = p.replace(/\D/g, "");
  // Qatar 8-digit mobile
  if (digits.length === 8) return `+974${digits}`;
  if (digits.length === 11 && digits.startsWith("974")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+974${digits.slice(1)}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export async function sendSms(toPhone: string, body: string): Promise<SmsResult> {
  const provider = (process.env.SMS_PROVIDER || process.env.WHATSAPP_PROVIDER || "off").toLowerCase();

  if (provider === "off" || provider === "") {
    console.warn("SMS_PROVIDER=off — message not sent:", body.slice(0, 60));
    return { ok: false, error: "SMS disabled (set SMS_PROVIDER=twilio)" };
  }

  if (provider === "twilio") {
    return sendTwilioSms(toPhone, body);
  }

  return { ok: false, error: `Unknown SMS_PROVIDER=${provider}` };
}

async function sendTwilioSms(toPhone: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM || process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return {
      ok: false,
      error: "Twilio SMS keys missing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM",
    };
  }

  const to = normalizePhone(toPhone);
  const params = new URLSearchParams({ From: from, To: to, Body: body });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.message || JSON.stringify(data) };
    }
    return { ok: true, sid: data.sid };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "SMS failed" };
  }
}

/** Booking SMS templates (customer) */
export function bookingSmsText(opts: {
  kind: "confirmed" | "completed" | "cancelled";
  customerName: string;
  serviceName: string;
  staffName: string;
  date: string;
  time: string;
  amount?: number;
}) {
  const salon = process.env.SALON_NAME || "HARMONIC SALON";
  if (opts.kind === "completed") {
    return `${salon}: Hi ${opts.customerName}, service COMPLETED. ${opts.serviceName} with ${opts.staffName} on ${opts.date}. Thank you!`;
  }
  if (opts.kind === "cancelled") {
    return `${salon}: Booking CANCELLED — ${opts.serviceName} on ${opts.date} ${opts.time}. Book again anytime.`;
  }
  return (
    `${salon}: Booking CONFIRMED for ${opts.customerName}. ` +
    `${opts.serviceName} with ${opts.staffName} on ${opts.date} at ${opts.time}` +
    (opts.amount != null ? ` · ${opts.amount} QAR` : "") +
    `. Arrive 5 min early.`
  );
}

/** Staff notification SMS templates */
export function staffBookingSmsText(opts: {
  kind: "new" | "cancelled";
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  date: string;
  time: string;
  amount?: number;
}) {
  const salon = process.env.SALON_NAME || "HARMONIC SALON";
  if (opts.kind === "cancelled") {
    return `${salon}: Booking CANCELLED. ${opts.customerName} — ${opts.serviceName} on ${opts.date} ${opts.time}`;
  }
  return (
    `${salon}: NEW BOOKING\n` +
    `Customer: ${opts.customerName}` +
    (opts.customerPhone ? ` (${opts.customerPhone})` : "") +
    `\nService: ${opts.serviceName}\n` +
    `Date: ${opts.date} at ${opts.time}` +
    (opts.amount != null ? `\nAmount: ${opts.amount} QAR` : "")
  );
}

export async function sendBookingSms(opts: {
  toPhone: string;
  kind: "confirmed" | "completed" | "cancelled";
  customerName: string;
  serviceName: string;
  staffName: string;
  date: string;
  time: string;
  amount?: number;
}) {
  const text = bookingSmsText(opts);
  return sendSms(opts.toPhone, text);
}

/** Send SMS to staff when new booking / cancel */
export async function sendStaffBookingSms(opts: {
  toPhone: string;
  kind: "new" | "cancelled";
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  date: string;
  time: string;
  amount?: number;
}) {
  if (!opts.toPhone) return { ok: false, error: "No staff phone" };
  const text = staffBookingSmsText(opts);
  return sendSms(opts.toPhone, text);
}
