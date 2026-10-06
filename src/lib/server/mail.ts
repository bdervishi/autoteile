import "server-only";
import { lookup } from "node:dns/promises";
import nodemailer from "nodemailer";
import { escapeHtml } from "../plain-text";
import { BRAND_NAME } from "../constants";
export function mailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    process.env.SMTP_FROM &&
    process.env.APP_ORIGIN
  );
}
export function mailLayout(subject: string, body: string) {
  return `<html lang="de-CH"><body style="font:16px/1.6 Arial;color:#20252a"><main style="max-width:600px;margin:auto;padding:32px"><p style="color:#ee5b27;font-weight:bold">${escapeHtml(BRAND_NAME)}</p><h1 style="font-size:24px">${escapeHtml(subject)}</h1><p style="white-space:pre-line">${escapeHtml(body)}</p><hr><p style="font-size:12px;color:#697078">Deine E-Mail-Adresse bleibt verborgen. Bei einer Anfrage kannst du direkt auf diese Mail antworten: Deine Antwort erscheint im Anfrage-Verlauf.</p></main></body></html>`;
}
export async function sendMail(message: {
  recipient: string;
  subject: string;
  body: string;
  reply_to?: string | null;
}) {
  if (!mailConfigured()) throw new Error("SMTP not configured");
  if (
    /[\r\n]/.test(message.recipient) ||
    /[\r\n]/.test(message.subject) ||
    (message.reply_to && /[\r\n]/.test(message.reply_to))
  )
    throw new Error("Invalid email header");
  const allowlist = (process.env.EMAIL_RECIPIENT_ALLOWLIST || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length && !allowlist.includes(message.recipient.toLowerCase()))
    throw new Error("Recipient not allowed");
  const host = process.env.SMTP_HOST!;
  const { address } = await lookup(host, { family: 4 });
  const transport = nodemailer.createTransport({
    host: address,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    requireTLS: true,
    tls: { servername: host, rejectUnauthorized: true },
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    connectionTimeout: 10000,
    socketTimeout: 20000,
  });
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM!,
      to: message.recipient,
      subject: message.subject,
      text: message.body,
      html: mailLayout(message.subject, message.body),
      replyTo: message.reply_to || undefined,
    });
  } finally {
    transport.close();
  }
}
