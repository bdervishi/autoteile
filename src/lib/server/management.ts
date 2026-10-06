import "server-only";
import { db, databaseConfigured } from "./db";
import { currentUser } from "./auth";
import { hashToken, verifyToken } from "./tokens";
export async function managementIdentity(token?: string) {
  if (!databaseConfigured()) return null;
  if (token) {
    const v = verifyToken(token, "management");
    if (!v) return null;
    const { data: access } = await db()
      .from("access_tokens")
      .select("subject_id")
      .eq("token_hash", hashToken(token))
      .eq("purpose", "management")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!access) return null;
    return { kind: "guest" as const, email: v.subject };
  }
  const user = await currentUser();
  return user ? { kind: "user" as const, id: user.id } : null;
}
export async function managedItems(token?: string) {
  const identity = await managementIdentity(token);
  if (!identity) return null;
  let query = db().from("parts_items").select("id,title,status,created_at");
  query =
    identity.kind === "user"
      ? query.eq("owner_user_id", identity.id)
      : query.eq("guest_email", identity.email).is("owner_user_id", null);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return null;
  return { items: data || [], identity };
}
