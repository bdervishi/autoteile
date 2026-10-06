"use server";
import { sealOutbox } from "@/lib/server/outbox-crypto";
import { randomUUID } from "node:crypto";
import { wantedSchema } from "@/lib/listing.schemas";
import { db, databaseConfigured } from "@/lib/server/db";
import { publicGuard } from "@/lib/server/guard";
import { mailConfigured } from "@/lib/server/mail";
import { issueToken, hashToken, verifyToken } from "@/lib/server/tokens";
import { autoCheckWanted } from "@/lib/wanted";
import { revalidatePath } from "next/cache";
import type { Result } from "@/lib/listing.types";
export async function createWanted(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = wantedSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        "Bitte alle Angaben prüfen. Ein Gesuch umfasst höchstens fünf Artikel.",
    };
  if (!databaseConfigured() || !mailConfigured())
    return { ok: false, error: "Gesuche sind noch nicht eingerichtet." };
  try {
    const data = parsed.data;
    const rejected = await publicGuard(data, "wanted", 3, 86400);
    if (rejected) return { ok: false, error: rejected };
    const { data: settings } = await db()
      .from("platform_settings")
      .select("value")
      .eq("id", true)
      .single();
    if (!settings?.value.wantedEnabled)
      return { ok: false, error: "Gesuche sind derzeit deaktiviert." };
    const group = randomUUID();
    const token = issueToken(group, "wanted-confirm");
    const articles = data.articles.map((a) => ({
      ...a,
      id: randomUUID(),
      group_id: group,
      group_title: data.group_title,
      owner_type: "guest",
      owner_name: data.owner_name,
      guest_email: data.guest_email,
      note: data.note,
      pickup_zip: data.pickup_zip,
      status: "pending_email",
      auto_check: autoCheckWanted(
        `${data.group_title} ${data.note} ${a.make} ${a.model} ${a.oem_number}`,
      ),
    }));
    const { data: created, error } = await db().rpc("create_wanted", {
      p_articles: articles,
      p_hash: hashToken(token),
      p_mail: {
        recipient: data.guest_email,
        subject: "Bestätige dein Gesuch",
        body: sealOutbox(
          `Bitte bestätige dein Gesuch «${data.group_title}». Danach prüfen wir es vor der Veröffentlichung.\n\n${process.env.APP_ORIGIN}/teile/gesuch/bestaetigen?token=${token}`,
        ),
      },
    });
    if (error) throw error;
    if (!created)
      return {
        ok: false,
        error: "Du kannst höchstens zehn offene Gesuch-Artikel haben.",
      };
    return {
      ok: true,
      data: {
        message:
          "Bitte bestätige dein Gesuch über den Link in deiner E-Mail. Danach wird es geprüft.",
      },
    };
  } catch {
    return {
      ok: false,
      error: "Dein Gesuch konnte derzeit nicht gespeichert werden.",
    };
  }
}
export async function confirmWanted(
  token: string,
): Promise<Result<{ message: string }>> {
  const verified = verifyToken(token, "wanted-confirm");
  if (!verified || !databaseConfigured())
    return {
      ok: false,
      error: "Der Bestätigungslink ist ungültig oder abgelaufen.",
    };
  try {
    const { data, error } = await db().rpc("confirm_wanted", {
      p_group: verified.subject,
      p_hash: hashToken(token),
    });
    if (error) throw error;
    if (!data)
      return {
        ok: false,
        error: "Dieser Link wurde bereits verwendet oder ist abgelaufen.",
      };
    revalidatePath("/teile");
    return {
      ok: true,
      data: { message: "Dein Gesuch wird jetzt von der Moderation geprüft." },
    };
  } catch {
    return { ok: false, error: "Die Bestätigung ist derzeit nicht möglich." };
  }
}
export async function renewWanted(
  token: string,
): Promise<Result<{ message: string }>> {
  const verified = verifyToken(token, "wanted-renew");
  if (!verified || !databaseConfigured())
    return {
      ok: false,
      error: "Dieser Verlängerungslink ist ungültig oder abgelaufen.",
    };
  try {
    const { data, error } = await db().rpc("renew_wanted", {
      p_group: verified.subject,
      p_hash: hashToken(token),
    });
    if (error) throw error;
    if (!data)
      return {
        ok: false,
        error: "Dieses Gesuch kann nicht mehr verlängert werden.",
      };
    revalidatePath("/teile");
    return {
      ok: true,
      data: { message: "Dein Gesuch ist weitere 30 Tage aktiv." },
    };
  } catch {
    return { ok: false, error: "Die Verlängerung ist derzeit nicht möglich." };
  }
}
