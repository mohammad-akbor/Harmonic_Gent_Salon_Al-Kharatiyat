/**
 * Gmail SMTP via nodemailer (preferred) or fallback message.
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 */

export type MailResult = { ok: boolean; error?: string };

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<MailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const from = process.env.MAIL_FROM || user;

  if (!host || !user || !pass) {
    return {
      ok: false,
      error: "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local",
    };
  }

  try {
    // Dynamic import so app runs even if nodemailer not installed yet
    let nodemailer: any;
    try {
      nodemailer = require("nodemailer");
    } catch {
      return {
        ok: false,
        error: "nodemailer not installed. Run: npm install nodemailer",
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.subject,
    });

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Mail send failed" };
  }
}

export async function sendBookingEmail(to: string, details: string) {
  return sendMail({
    to,
    subject: "HARMONIC SALON — Booking Confirmed",
    html: `<div style="font-family:sans-serif"><h2>Booking Confirmed</h2><pre>${details}</pre><p>— HARMONIC SALON</p></div>`,
    text: details,
  });
}
