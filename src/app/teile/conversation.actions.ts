"use server";
import { z } from "zod";
import { plain } from "@/lib/listing.schemas";
import { db, databaseConfigured } from "@/lib/server/db";
import { tradeAccess } from "@/lib/server/trade-access";
import { verifyToken, hashToken } from "@/lib/server/tokens";
import { rateLimit } from "@/lib/server/guard";
import { revalidatePath } from "next/cache";
import type { Result } from "@/lib/listing.types";
export async function writeMessage(
  token: string,
  body: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = plain(1, 2000).safeParse(body);
  if (!parsed.success)
    return {
      ok: false,
      error: "Bitte eine Nachricht mit höchstens 2000 Zeichen schreiben.",
    };
  try {
    const access = await tradeAccess(token);
    if (!access)
      return {
        ok: false,
        error: "Dein Zugangslink ist ungültig oder abgelaufen.",
      };
    if (
      !(await rateLimit(`message:${access.trade.id}:${access.role}`, 20, 3600))
    )
      return { ok: false, error: "Bitte später erneut schreiben." };
    const { data, error } = await db().rpc("add_trade_message", {
      p_trade_id: access.trade.id,
      p_role: access.role,
      p_body: parsed.data,
    });
    if (error) throw error;
    if (!data) return { ok: false, error: "Diese Anfrage ist abgeschlossen." };
    revalidatePath(`/teile/anfrage/${token}`);
    return { ok: true, data: { message: "Nachricht gesendet." } };
  } catch {
    return { ok: false, error: "Die Nachricht konnte nicht gesendet werden." };
  }
}
export async function changeTradeStatus(
  token: string,
  action: string,
): Promise<Result<{ message: string }>> {
  if (!["accept", "decline", "complete", "release", "cancel"].includes(action))
    return { ok: false, error: "Ungültige Aktion." };
  try {
    const access = await tradeAccess(token);
    if (!access)
      return {
        ok: false,
        error: "Dein Zugangslink ist ungültig oder abgelaufen.",
      };
    if (
      (access.role === "requester" && action !== "cancel") ||
      (access.role === "owner" && action === "cancel")
    )
      return { ok: false, error: "Diese Aktion ist nicht erlaubt." };
    const { data, error } = await db().rpc("transition_trade", {
      p_trade: access.trade.id,
      p_role: access.role,
      p_action: action,
    });
    if (error) throw error;
    if (!data)
      return {
        ok: false,
        error:
          "Der Status hat sich inzwischen geändert. Bitte die Seite neu laden.",
      };
    revalidatePath("/teile");
    revalidatePath(`/teile/anfrage/${token}`);
    return { ok: true, data: { message: "Status aktualisiert." } };
  } catch {
    return { ok: false, error: "Der Status konnte nicht geändert werden." };
  }
}
export async function releaseTwint(
  token: string,
): Promise<Result<{ message: string }>> {
  const verified = verifyToken(token, "twint-release");
  if (!verified || !databaseConfigured())
    return {
      ok: false,
      error: "Dieser Freigabelink ist ungültig oder abgelaufen.",
    };
  try {
    const { data, error } = await db().rpc("release_twint", {
      p_trade: verified.subject,
      p_hash: hashToken(token),
    });
    if (error) throw error;
    if (!data)
      return { ok: false, error: "Diese Freigabe ist nicht mehr möglich." };
    revalidatePath("/teile");
    return {
      ok: true,
      data: { message: "Die TWINT-Nummer ist für diese Person freigegeben." },
    };
  } catch {
    return { ok: false, error: "Die Freigabe ist derzeit nicht möglich." };
  }
}
