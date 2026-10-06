"use server";
import { enqueueMatches } from "@/lib/server/matching";
import { z } from "zod";
import { moderator } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { plain } from "@/lib/listing.schemas";
import { revalidatePath } from "next/cache";
import type { Result } from "@/lib/listing.types";
export async function moderate(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = z
    .object({
      id: z.string().uuid(),
      kind: z.enum(["wanted", "report"]),
      action: z.enum([
        "approve",
        "reject",
        "unhide",
        "withdraw",
        "delete",
        "dismiss",
      ]),
      reason: plain(0, 1000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte die Angaben prüfen." };
  try {
    const actor = await moderator();
    if (!actor)
      return { ok: false, error: "Dafür brauchst du Moderationsrechte." };
    const d = parsed.data;
    if (d.action === "reject" && !d.reason)
      return { ok: false, error: "Bitte einen Ablehnungsgrund angeben." };
    const { data, error } = await db().rpc("moderate_entry", {
      p_actor: actor.id,
      p_id: d.id,
      p_kind: d.kind,
      p_action: d.action,
      p_reason: d.reason,
    });
    if (error) throw error;
    if (!data)
      return { ok: false, error: "Der Eintrag ist nicht mehr verfügbar." };
    await enqueueMatches();
    revalidatePath("/admin");
    revalidatePath("/teile");
    return { ok: true, data: { message: "Moderation gespeichert." } };
  } catch {
    return {
      ok: false,
      error: "Die Moderation konnte nicht gespeichert werden.",
    };
  }
}
export async function updateSettings(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const { settingsSchema } = await import("@/lib/settings.schemas");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        "Bitte die Einstellungen prüfen. Stripe ist noch nicht aktivierbar.",
    };
  try {
    const actor = await moderator();
    if (!actor || actor.role !== "admin")
      return {
        ok: false,
        error: "Nur Administratoren können Einstellungen ändern.",
      };
    const { error } = await db()
      .from("platform_settings")
      .update({ value: parsed.data })
      .eq("id", true);
    if (error) throw error;
    revalidatePath("/admin");
    return { ok: true, data: { message: "Einstellungen gespeichert." } };
  } catch {
    return {
      ok: false,
      error: "Die Einstellungen konnten nicht gespeichert werden.",
    };
  }
}

export async function manageEntry(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = z
    .object({
      id: z.string().uuid(),
      kind: z.enum(["item", "business"]),
      action: z.enum(["hide", "unhide", "verify", "unverify"]),
      reason: plain(1, 1000),
    })
    .safeParse(input);
  if (!parsed.success || !parsed.data.reason.trim())
    return { ok: false, error: "Bitte eine Begründung angeben." };
  try {
    const actor = await moderator();
    if (!actor)
      return { ok: false, error: "Dafür brauchst du Moderationsrechte." };
    const { data, error } = await db().rpc("admin_manage_entry", {
      p_actor: actor.id,
      p_id: parsed.data.id,
      p_kind: parsed.data.kind,
      p_action: parsed.data.action,
      p_reason: parsed.data.reason,
    });
    if (error || !data)
      return {
        ok: false,
        error: "Die Änderung konnte nicht gespeichert werden.",
      };
    revalidatePath("/admin");
    revalidatePath("/teile");
    revalidatePath("/anbieter", "layout");
    return { ok: true, data: { message: "Änderung gespeichert." } };
  } catch {
    return {
      ok: false,
      error: "Die Änderung konnte nicht gespeichert werden.",
    };
  }
}
