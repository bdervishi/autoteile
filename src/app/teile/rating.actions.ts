"use server";
import { z } from "zod";
import { plain } from "@/lib/listing.schemas";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import type { Result } from "@/lib/listing.types";
export async function rateTrade(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = z
    .object({
      item_id: z.string().uuid(),
      rated_user_id: z.string().uuid(),
      stars: z.number().int().min(1).max(5),
      comment: plain(0, 1000),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Bitte die Bewertung prüfen." };
  try {
    const user = await currentUser();
    if (!user) return { ok: false, error: "Bitte mit deinem Konto anmelden." };
    const { data, error } = await db().rpc("create_rating", {
      p_rater: user.id,
      p_rated: parsed.data.rated_user_id,
      p_item: parsed.data.item_id,
      p_stars: parsed.data.stars,
      p_comment: parsed.data.comment,
    });
    if (error) throw error;
    return data
      ? { ok: true, data: { message: "Deine Bewertung wurde gespeichert." } }
      : {
          ok: false,
          error:
            "Bewertungen sind nur einmal nach einer abgeschlossenen Übergabe mit Konto möglich.",
        };
  } catch {
    return {
      ok: false,
      error: "Die Bewertung konnte nicht gespeichert werden.",
    };
  }
}
