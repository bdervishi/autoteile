"use server";
import { sealOutbox } from "@/lib/server/outbox-crypto";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { inquirySchema, plain } from "@/lib/listing.schemas";
import { db, databaseConfigured } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { publicGuard, clientIpHash, rateLimit } from "@/lib/server/guard";
import { issueToken, hashToken, replyAddress } from "@/lib/server/tokens";
import { mailConfigured } from "@/lib/server/mail";
import type { Result } from "@/lib/listing.types";
export async function sendInquiry(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Bitte Name, E-Mail-Adresse und Nachricht prüfen.",
    };
  if (!databaseConfigured() || !mailConfigured() || !process.env.REPLY_DOMAIN)
    return {
      ok: false,
      error:
        "Anfragen sind noch nicht eingerichtet. Bitte später erneut versuchen.",
    };
  try {
    const user = await currentUser();
    const data = parsed.data;
    const email = user?.email || data.requester_email;
    if (!user) {
      const reason = await publicGuard(data, "inquiry");
      if (reason) return { ok: false, error: reason };
    } else if (!(await rateLimit(`inquiry:user:${user.id}`, 5, 3600)))
      return {
        ok: false,
        error: "Zu viele Anfragen. Bitte später erneut versuchen.",
      };
    if (
      !(await rateLimit(`inquiry:email:${hashToken(email)}`, 5, 3600)) ||
      !(await rateLimit(`inquiry:item:${data.item_id}`, 20, 86400))
    )
      return {
        ok: false,
        error:
          "Das Anfrage-Limit wurde erreicht. Bitte später erneut versuchen.",
      };
    const { data: item, error: lookupError } = await db()
      .from("parts_items")
      .select("id,title,owner_user_id,guest_email,payment_mode")
      .eq("id", data.item_id)
      .in("status", ["available", "reserved"])
      .is("moderation_hidden_at", null)
      .not("email_confirmed_at", "is", null)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!item)
      return { ok: false, error: "Dieses Inserat ist nicht mehr verfügbar." };
    if (
      (user && user.id === item.owner_user_id) ||
      (item.guest_email && item.guest_email === email)
    )
      return {
        ok: false,
        error: "Du kannst dein eigenes Inserat nicht anfragen.",
      };
    if (data.twint_requested && item.payment_mode !== "twint-direct")
      return {
        ok: false,
        error: "Dieses Inserat bietet keine TWINT-Direktzahlung an.",
      };
    let ownerEmail = item.guest_email;
    if (item.owner_user_id) {
      const { data: owner } = await db().auth.admin.getUserById(
        item.owner_user_id,
      );
      ownerEmail = owner.user?.email;
    }
    if (!ownerEmail) throw new Error("Owner email unavailable");
    const id = randomUUID();
    const requesterToken = issueToken(id, "trade-requester");
    const ownerToken = issueToken(id, "trade-owner");
    const twintToken = issueToken(id, "twint-release", 30 * 86400);
    const { captchaToken, ag_hp_field, ...fields } = data;
    const { error } = await db().rpc("create_inquiry", {
      p_trade: {
        ...fields,
        id,
        requester_type: user ? "private" : "guest",
        requester_user_id: user?.id || null,
        requester_email: email,
        access_token_hash: hashToken(requesterToken),
      },
      p_tokens: [
        {
          token_hash: hashToken(requesterToken),
          subject_id: id,
          purpose: "trade-requester",
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
        {
          token_hash: hashToken(ownerToken),
          subject_id: id,
          purpose: "trade-owner",
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
        ...(data.twint_requested
          ? [
              {
                token_hash: hashToken(twintToken),
                subject_id: id,
                purpose: "twint-release",
                expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
              },
            ]
          : []),
      ],
      p_mails: [
        {
          dedupe_key: `inquiry:${id}:owner`,
          recipient: ownerEmail,
          subject: `${data.twint_requested ? "TWINT-Kaufanfrage" : "Neue Anfrage"} zu ${item.title}`,
          body: sealOutbox(
            `${data.requester_name} schreibt:\n${data.message}\n\nAnfrage öffnen:\n${process.env.APP_ORIGIN}/teile/anfrage/${ownerToken}${data.twint_requested ? `\n\nTWINT-Nummer freigeben:\n${process.env.APP_ORIGIN}/teile/twint-freigabe/${twintToken}` : ""}`,
          ),
          reply_to: replyAddress(id, "o", process.env.REPLY_DOMAIN!),
        },
        {
          dedupe_key: `inquiry:${id}:requester`,
          recipient: email,
          subject: "Deine Anfrage ist unterwegs",
          body: sealOutbox(
            `Deine Anfrage zu «${item.title}» wurde gesendet.\n\nDein persönlicher Verlauf:\n${process.env.APP_ORIGIN}/teile/anfrage/${requesterToken}`,
          ),
          reply_to: replyAddress(id, "r", process.env.REPLY_DOMAIN!),
        },
      ],
    });
    if (error) {
      if (error.code === "23505")
        return {
          ok: false,
          error: "Du hast für dieses Inserat bereits eine offene Anfrage.",
        };
      throw error;
    }
    return {
      ok: true,
      data: {
        message:
          "Deine Anfrage wurde gesendet. Du erhältst den persönlichen Verlauf per E-Mail.",
      },
    };
  } catch (error) {
    console.error(
      "Inquiry failed",
      error instanceof Error ? error.name : "unknown",
    );
    return {
      ok: false,
      error: "Die Anfrage konnte derzeit nicht gesendet werden.",
    };
  }
}
export async function reportItem(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = z
    .object({
      item_id: z.string().uuid(),
      reason: z.enum([
        "betrug",
        "gestohlen",
        "verboten",
        "unangemessen",
        "spam",
        "falsche_angaben",
        "sonstiges",
      ]),
      note: plain(0, 1000),
      captchaToken: z.string(),
      ag_hp_field: z.string(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte die Meldung prüfen." };
  if (!databaseConfigured())
    return {
      ok: false,
      error: "Meldungen sind in der Vorschau noch nicht möglich.",
    };
  try {
    const reason = await publicGuard(parsed.data, "report", 5);
    if (reason) return { ok: false, error: reason };
    const { data: item } = await db()
      .from("parts_items")
      .select("id")
      .eq("id", parsed.data.item_id)
      .is("moderation_hidden_at", null)
      .not("email_confirmed_at", "is", null)
      .maybeSingle();
    if (!item)
      return { ok: false, error: "Dieses Inserat ist nicht verfügbar." };
    const user = await currentUser();
    const { error } = await db()
      .from("parts_reports")
      .insert({
        item_id: item.id,
        reason: parsed.data.reason,
        note: parsed.data.note,
        reporter_ip_hash: await clientIpHash(),
        reporter_user_id: user?.id || null,
      });
    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "Du hast dieses Inserat bereits gemeldet." };
      throw error;
    }
    return {
      ok: true,
      data: { message: "Danke. Deine Meldung wird geprüft." },
    };
  } catch {
    return { ok: false, error: "Die Meldung konnte nicht gespeichert werden." };
  }
}
