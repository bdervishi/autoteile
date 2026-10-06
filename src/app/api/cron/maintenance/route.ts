import { db, databaseConfigured } from "@/lib/server/db";
import { validCron } from "@/lib/server/http-security";
import { sendMail, mailConfigured } from "@/lib/server/mail";
import { issueToken, hashToken } from "@/lib/server/tokens";
import { sealOutbox, openOutbox } from "@/lib/server/outbox-crypto";
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
  const { data: batch, error } = await database.rpc("claim_outbox", {
    p_limit: 5,
  });
  if (error) return new Response("Queue unavailable", { status: 503 });
  let sent = 0;
  let failed = 0;
  await Promise.all(
    (batch || []).map(async (row: Record<string, any>) => {
      try {
        await sendMail({
          recipient: row.recipient,
          subject: row.subject,
          body: openOutbox(row.body),
          reply_to: row.reply_to,
        });
        const { error: updateError } = await database
          .from("email_outbox")
          .update({
            sent_at: new Date().toISOString(),
            locked_until: null,
            lease_id: null,
            last_error: null,
          })
          .eq("id", row.id)
          .eq("lease_id", row.lease_id);
        if (updateError) throw updateError;
        if (row.dedupe_key.startsWith("wanted-match:")) {
          const [, wantedId, itemId] = row.dedupe_key.split(":");
          await database
            .from("parts_wanted_matches")
            .update({ notified_at: new Date().toISOString() })
            .eq("wanted_id", wantedId)
            .eq("item_id", itemId);
        }
        sent++;
      } catch {
        await database
          .from("email_outbox")
          .update({
            available_at: new Date(
              Date.now() + Math.min(3600, 60 * 2 ** row.attempts) * 1000,
            ).toISOString(),
            locked_until: null,
            lease_id: null,
            last_error: "Delivery failed",
          })
          .eq("id", row.id)
          .eq("lease_id", row.lease_id);
        failed++;
      }
    }),
  );
  return Response.json({ sent, failed });
}
