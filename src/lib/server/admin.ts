import "server-only";
import { currentUser } from "./auth";
import { db, databaseConfigured } from "./db";
export async function moderator() {
  if (!databaseConfigured()) return null;
  const user = await currentUser();
  if (!user) return null;
  const { data } = await db()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return data && ["moderator", "admin"].includes(data.role)
    ? { id: user.id, role: data.role }
    : null;
}
