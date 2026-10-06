import "server-only";
import { db, databaseConfigured } from "./db";
export async function enqueueMatches() {
  if (!databaseConfigured() || !process.env.APP_ORIGIN) return;
  const { error } = await db().rpc("enqueue_wanted_matches", {
    p_origin: process.env.APP_ORIGIN,
  });
  if (error) console.error("Wanted matching postponed to maintenance");
}
