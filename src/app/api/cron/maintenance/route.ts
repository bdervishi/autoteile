import { db, databaseConfigured } from "@/lib/server/db";
import { validCron } from "@/lib/server/http-security";
import { mailConfigured } from "@/lib/server/mail";
import { deliverOutbox } from "@/lib/server/outbox";
import { issueToken, hashToken } from "@/lib/server/tokens";
import { sealOutbox } from "@/lib/server/outbox-crypto";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!validCron(request)) return new Response("Unauthorized", { status: 401 });
  if (!databaseConfigured() || !mailConfigured())
    return new Response("Services not configured", { status: 503 });
  const database = db();
  const { error: expiryError } = await database
    .from("parts_wanted")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());
  if (expiryError) return new Response("Maintenance failed", { status: 503 });
  const { data: expiring } = await database
    .from("parts_wanted")
    .select("group_id")
    .eq("status", "active")
    .is("expiry_reminded_at", null)
    .gt("expires_at", new Date().toISOString())
    .lt("expires_at", new Date(Date.now() + 3 * 86400000).toISOString())
    .limit(100);
  for (const group of new Set((expiring || []).map((w) => w.group_id))) {
    const token = issueToken(String(group), "wanted-renew");
    await database.rpc("remind_wanted", {
      p_group: group,
      p_hash: hashToken(token),
      p_origin: process.env.APP_ORIGIN,
      p_body: sealOutbox(
        `Dein Gesuch läuft in Kürze ab. Verlängere es mit einem Klick auf dieser Seite:\n${process.env.APP_ORIGIN}/teile/gesuch/verlaengern?token=${token}`,
      ),
    });
  }
  const { error: matchError } = await database.rpc("enqueue_wanted_matches", {
    p_origin: process.env.APP_ORIGIN,
  });
  if (matchError) return new Response("Matching failed", { status: 503 });
  // Daily on Vercel Hobby: drain the backlog (retries, matches, reminders) in several leased batches.
  let sent = 0;
  let failed = 0;
  for (let round = 0; round < 5; round++) {
    const result = await deliverOutbox(20);
    if (!result) return new Response("Queue unavailable", { status: 503 });
    sent += result.sent;
    failed += result.failed;
    if (result.sent + result.failed < 20) break;
  }
  return Response.json({ sent, failed });
}
