import "server-only";
import { timingSafeEqual } from "node:crypto";
export function validCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const incoming = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    incoming.length === expected.length && timingSafeEqual(incoming, expected)
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    !!process.env.APP_ORIGIN &&
    origin === new URL(process.env.APP_ORIGIN).origin
  );
}
