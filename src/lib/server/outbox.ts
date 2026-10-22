import "server-only";
import { after } from "next/server";
import { db, databaseConfigured } from "./db";
import { sendMail, mailConfigured } from "./mail";
import { openOutbox } from "./outbox-crypto";
// Leased delivery: concurrent callers (actions, cron) never claim the same row twice.
export async function deliverOutbox(limit = 10) {
  if (!databaseConfigured() || !mailConfigured()) return null;
  const database = db();
  const { data: batch, error } = await database.rpc("claim_outbox", {
    p_limit: limit,
  });
  if (error) return null;
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
  return { sent, failed };
}
// Sends queued mail right after the response; the daily cron only catches retries.
export function deliverOutboxSoon() {
  after(async () => {
    try {
      await deliverOutbox();
    } catch {
      console.error("Outbox delivery postponed to maintenance");
    }
  });
}
