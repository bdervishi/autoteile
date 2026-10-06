"use server";
import { randomUUID } from "node:crypto";
import { businessSchema } from "@/lib/business.schemas";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/guard";
import { ownPhotoUrl } from "@/lib/server/images";
import type { Result } from "@/lib/listing.types";
export async function createBusiness(
  input: unknown,
): Promise<Result<{ slug: string }>> {
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Bitte Firmenangaben und UID-Nummer prüfen." };
  try {
    const user = await currentUser();
    if (!user)
      return { ok: false, error: "Bitte zuerst mit deinem Konto anmelden." };
    if (!(await rateLimit(`business:${user.id}`, 3, 86400)))
      return { ok: false, error: "Bitte später erneut versuchen." };
    if (
      parsed.data.logo_url &&
      !ownPhotoUrl(parsed.data.logo_url, process.env.NEXT_PUBLIC_SUPABASE_URL!)
    )
      return {
        ok: false,
        error: "Bitte ein hier hochgeladenes Logo verwenden.",
      };
    const slug = `${parsed.data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50)}-${randomUUID().slice(0, 8)}`;
    const { error } = await db()
      .from("businesses")
      .insert({ ...parsed.data, owner_user_id: user.id, slug });
    if (error) throw error;
    return { ok: true, data: { slug } };
  } catch {
    return {
      ok: false,
      error: "Das Firmenprofil konnte derzeit nicht angelegt werden.",
    };
  }
}
