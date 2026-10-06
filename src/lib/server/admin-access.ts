import "server-only";
import { databaseConfigured } from "./db";
import { moderator } from "./admin";
export async function adminAccess(adminOnly = false) {
  const preview = !databaseConfigured();
  const actor = await moderator();
  return {
    preview,
    actor,
    allowed: preview || (!!actor && (!adminOnly || actor.role === "admin")),
  };
}
