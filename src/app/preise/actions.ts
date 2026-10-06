"use server";
import {
  commercialRequestSchema,
  commercialDecisionSchema,
  COMMERCIAL_OFFERS,
} from "@/lib/monetization";
import { currentUser } from "@/lib/server/auth";
import { moderator } from "@/lib/server/admin";
import { databaseConfigured, db } from "@/lib/server/db";
import { publicGuard } from "@/lib/server/guard";
import { revalidatePath } from "next/cache";
import type { Result } from "@/lib/listing.types";
export async function requestCommercialOffer(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = commercialRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte die Angaben prüfen." };
  if (!databaseConfigured())
    return {
      ok: false,
      error:
        "Die Pilotanmeldung ist noch nicht eingerichtet. Es wurde nichts gespeichert oder berechnet.",
    };
  try {
    const user = await currentUser();
    if (!user?.email)
      return {
        ok: false,
        error: "Bitte zuerst in deinem persönlichen Bereich anmelden.",
      };
    const rejection = await publicGuard(parsed.data, "commercial_request");
    if (rejection) return { ok: false, error: rejection };
    const d = parsed.data;
    if (d.offer === "boost") {
      const { data, error } = await db()
        .from("parts_items")
        .select("id")
        .eq("id", d.itemId)
        .eq("owner_user_id", user.id)
        .eq("status", "available")
        .is("moderation_hidden_at", null)
        .not("email_confirmed_at", "is", null)
        .maybeSingle();
      if (error || !data)
        return {
          ok: false,
          error: "Bitte ein verfügbares eigenes Inserat wählen.",
        };
    }
    const { error } = await db()
      .from("commercial_requests")
      .insert({
        user_id: user.id,
        email: user.email,
        offer: d.offer,
        name: d.name,
        note: d.note,
        item_id: d.offer === "boost" ? d.itemId : null,
        quoted_price_chf: COMMERCIAL_OFFERS[d.offer].price,
      });
    if (error) throw error;
    revalidatePath("/admin/umsatz");
    revalidatePath("/partner");
    return {
      ok: true,
      data: {
        message:
          "Deine unverbindliche Anfrage ist eingegangen. Wir besprechen die Freischaltung mit dir. Es wurde nichts berechnet.",
      },
    };
  } catch {
    return {
      ok: false,
      error:
        "Die Anfrage konnte nicht gespeichert werden. Bitte erneut versuchen.",
    };
  }
}
export async function decideCommercialRequest(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = commercialDecisionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Bitte eine interne Begründung angeben." };
  try {
    const actor = await moderator();
    if (actor?.role !== "admin")
      return {
        ok: false,
        error: "Nur Administratoren können diese Anfragen bearbeiten.",
      };
    const { data, error } = await db().rpc("decide_commercial_request", {
      p_actor: actor.id,
      p_id: parsed.data.id,
      p_status: parsed.data.status,
      p_note: parsed.data.note,
    });
    if (error || !data) throw new Error("Not saved");
    revalidatePath("/admin/umsatz");
    revalidatePath("/partner");
    return {
      ok: true,
      data: {
        message:
          "Bearbeitung gespeichert. Keine Zahlung oder Freischaltung ausgelöst.",
      },
    };
  } catch {
    return {
      ok: false,
      error: "Die Bearbeitung konnte nicht gespeichert werden.",
    };
  }
}
