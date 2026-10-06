import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";
export async function clientIpHash() {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
  if (!process.env.IP_HASH_SECRET) throw new Error("Missing IP salt");
  return createHmac("sha256", process.env.IP_HASH_SECRET)
    .update(ip)
    .digest("hex");
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const { data, error } = await db().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw error;
  return data === true;
}
export async function verifyCaptcha(token: string, action: string) {
  if (
    !token ||
    !process.env.RECAPTCHA_SECRET_KEY ||
    !process.env.RECAPTCHA_HOSTNAME
  )
    return false;
  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return false;
    const result = await response.json();
    return (
      result.success === true &&
      result.score >= 0.5 &&
      result.action === action &&
      result.hostname === process.env.RECAPTCHA_HOSTNAME &&
      Date.now() - Date.parse(result.challenge_ts) >= 0 &&
      Date.now() - Date.parse(result.challenge_ts) < 120000
    );
  } catch {
    return false;
  }
}
export async function publicGuard(
  input: { captchaToken?: string; ag_hp_field?: string },
  action: string,
  limit = 5,
  seconds = 3600,
) {
  if (input.ag_hp_field) {
    console.warn("Honeypot hit", { action });
    return "Die Anfrage konnte nicht verarbeitet werden.";
  }
  if (!(await rateLimit(`${action}:${await clientIpHash()}`, limit, seconds)))
    return "Zu viele Versuche. Bitte später erneut versuchen.";
  if (!(await verifyCaptcha(input.captchaToken || "", action)))
    return "Die Sicherheitsprüfung ist fehlgeschlagen. Bitte erneut versuchen.";
  return null;
}
