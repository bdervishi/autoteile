import "server-only";
import { db, databaseConfigured } from "./db";
import { hashToken, verifyToken } from "./tokens";
export async function tradeAccess(token: string) {
  if (!databaseConfigured()) return null;
  const owner = verifyToken(token, "trade-owner");
  const requester = verifyToken(token, "trade-requester");
  const verified = owner || requester;
  if (!verified) return null;
  const role = owner ? "owner" : "requester";
  const { data: access } = await db()
    .from("access_tokens")
    .select("subject_id")
    .eq("token_hash", hashToken(token))
    .eq("purpose", owner ? "trade-owner" : "trade-requester")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!access || access.subject_id !== verified.subject) return null;
  const { data: trade } = await db()
    .from("parts_trades")
    .select(
      "id,item_id,status,requester_name,twint_requested,twint_released_at",
    )
    .eq("id", verified.subject)
    .maybeSingle();
  if (!trade) return null;
  const { data: item } = await db()
    .from("parts_items")
    .select("title,owner_name,price_chf,payment_mode")
    .eq("id", trade.item_id)
    .maybeSingle();
  const { data: messages } = await db()
    .from("parts_messages")
    .select("id,sender_role,body,created_at")
    .eq("trade_id", trade.id)
    .order("created_at");
  return {
    trade,
    item,
    messages: messages || [],
    role: role as "owner" | "requester",
  };
}
