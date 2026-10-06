"use server";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { revalidatePath } from "next/cache";
export async function markNotificationsRead() {
  const user = await currentUser();
  if (!user) return;
  const { error } = await db()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (!error) revalidatePath("/teile/meine");
}
