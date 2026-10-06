"use server";
import { crmContactSchema, crmNoteSchema } from "@/lib/crm.schemas";
import { moderator } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { revalidatePath } from "next/cache";
import type { Result } from "@/lib/listing.types";
export async function saveContact(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = crmContactSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Bitte Kontaktdaten und Wiedervorlagedatum prüfen.",
    };
  try {
    const actor = await moderator();
    if (actor?.role !== "admin")
      return {
        ok: false,
        error: "Diese Änderung benötigt Administratorrechte.",
      };
    const { data, error } = await db().rpc("crm_save_contact", {
      p_actor: actor.id,
      p_contact: parsed.data,
    });
    if (error || !data) throw new Error("save failed");
    revalidatePath("/admin/crm");
    revalidatePath("/admin/statistik");
    return { ok: true, data: { message: "Kontakt gespeichert." } };
  } catch {
    return { ok: false, error: "Der Kontakt konnte nicht gespeichert werden." };
  }
}
export async function addContactNote(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = crmNoteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Bitte eine Notiz eingeben." };
  try {
    const actor = await moderator();
    if (actor?.role !== "admin")
      return {
        ok: false,
        error: "Diese Änderung benötigt Administratorrechte.",
      };
    const { data, error } = await db().rpc("crm_add_note", {
      p_actor: actor.id,
      p_contact: parsed.data.contactId,
      p_body: parsed.data.body,
    });
    if (error || !data) throw new Error("save failed");
    revalidatePath("/admin/crm");
    return { ok: true, data: { message: "Notiz gespeichert." } };
  } catch {
    return { ok: false, error: "Die Notiz konnte nicht gespeichert werden." };
  }
}

export async function importPartnerRequest(
  id: string,
): Promise<Result<{ message: string }>> {
  if (!/^[a-f0-9-]{36}$/.test(id))
    return { ok: false, error: "Ungültige Anfrage." };
  try {
    const actor = await moderator();
    if (actor?.role !== "admin")
      return { ok: false, error: "Administratorrechte erforderlich." };
    const { data, error } = await db().rpc("crm_import_request", {
      p_actor: actor.id,
      p_request: id,
    });
    if (error || !data) throw new Error("import failed");
    revalidatePath("/admin/crm");
    return {
      ok: true,
      data: {
        message:
          "Kontakt im CRM verfügbar. Eine wiederholte Übernahme erstellt keine Kopie.",
      },
    };
  } catch {
    return { ok: false, error: "Die Anfrage konnte nicht übernommen werden." };
  }
}
