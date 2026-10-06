"use server";
import { postcodeInfo } from "@/lib/postcodes";
import { sealOutbox } from "@/lib/server/outbox-crypto";
import { enqueueMatches } from "@/lib/server/matching";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { listingSchema, emailSchema } from "@/lib/listing.schemas";
import { db, databaseConfigured } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { publicGuard, clientIpHash, rateLimit } from "@/lib/server/guard";
import { sanitiseImage, ownPhotoUrl } from "@/lib/server/images";
import { issueToken, hashToken, verifyToken } from "@/lib/server/tokens";
import { mailConfigured } from "@/lib/server/mail";
import type { Result } from "@/lib/listing.types";
export async function createListing(
  input: unknown,
): Promise<Result<{ message: string }>> {
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const location = postcodeInfo(parsed.data.pickup_zip);
  if (location && !location.cantons.includes(parsed.data.pickup_canton))
    return { ok: false, error: "PLZ und Kanton passen nicht zusammen." };
  if (!databaseConfigured() || !mailConfigured())
    return {
      ok: false,
      error:
        "Inserieren ist noch nicht eingerichtet. Bitte später erneut versuchen.",
    };
  try {
    const user = await currentUser();
    const data = parsed.data;
    const { data: initialSettings, error: initialSettingsError } = await db()
      .from("platform_settings")
      .select("value")
      .eq("id", true)
      .single();
    if (initialSettingsError) throw initialSettingsError;
    if (!user) {
      if (!data.guest_email)
        return { ok: false, error: "Bitte deine E-Mail-Adresse angeben." };
      const rejected = await publicGuard(
        data,
        "listing",
        initialSettings.value.guestListingsPerIpPerDay,
        86400,
      );
      if (rejected) return { ok: false, error: rejected };
    } else if (
      !(await rateLimit(
        `listing:user:${user.id}`,
        data.business_id ? 100 : 20,
        86400,
      ))
    )
      return { ok: false, error: "Dein Tageslimit ist erreicht." };
    const { data: settings, error: settingsError } = await db()
      .from("platform_settings")
      .select("value")
      .eq("id", true)
      .single();
    if (settingsError) throw settingsError;
    if (!user && !settings.value.guestListingsEnabled)
      return { ok: false, error: "Gast-Inserate sind derzeit deaktiviert." };
    if (data.payment_mode === "stripe")
      return {
        ok: false,
        error:
          "Online-Zahlung ist noch nicht freigeschaltet. Bitte eine andere Angebotsart wählen.",
      };
    if (
      data.payment_mode === "twint-direct" &&
      !settings.value.twintDirectEnabled
    )
      return {
        ok: false,
        error: "TWINT-Direktzahlung ist derzeit deaktiviert.",
      };
    if (data.photos.length > Math.min(5, settings.value.maxPhotosPerListing))
      return { ok: false, error: "Zu viele Fotos." };
    if (
      data.photos.some(
        (url) => !ownPhotoUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL!),
      )
    )
      return {
        ok: false,
        error: "Bitte nur hier hochgeladene Fotos verwenden.",
      };
    const id = randomUUID();
    const token = issueToken(id, "listing-confirm");
    const { captchaToken, ag_hp_field, ...fields } = data;
    let businessId: string | null = null;
    if (data.business_id) {
      if (!user)
        return {
          ok: false,
          error: "Für gewerbliche Inserate brauchst du ein Konto.",
        };
      const { data: business } = await db()
        .from("businesses")
        .select("id")
        .eq("id", data.business_id)
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (!business)
        return {
          ok: false,
          error: "Dieses Firmenprofil gehört nicht zu deinem Konto.",
        };
      businessId = business.id;
    }
    const listing = {
      ...fields,
      business_id: businessId,
      id,
      owner_type: businessId ? "business" : user ? "private" : "guest",
      owner_user_id: user?.id || null,
      guest_email: user ? null : data.guest_email,
      email_confirmed_at: user ? new Date().toISOString() : null,
    };
    const recipient = user?.email || data.guest_email!;
    const message = user
      ? "Dein Inserat wurde veröffentlicht."
      : "Bitte bestätige deine E-Mail-Adresse. Dein Inserat erscheint erst nach der Bestätigung.";
    const { error } = await db().rpc("create_listing", {
      p_listing: listing,
      p_token_hash: hashToken(token),
      p_mail: {
        recipient,
        subject: user
          ? "Dein Inserat ist veröffentlicht"
          : "Bestätige dein Inserat",
        body: sealOutbox(
          `${message}\n\n${process.env.APP_ORIGIN}/teile/bestaetigen?token=${encodeURIComponent(token)}`,
        ),
      },
    });
    if (error) throw error;
    await enqueueMatches();
    revalidatePath("/teile");
    return { ok: true, data: { message } };
  } catch (error) {
    console.error(
      "createListing failed",
      error instanceof Error ? error.name : "unknown",
    );
    return {
      ok: false,
      error:
        "Das Inserat konnte nicht gespeichert werden. Bitte später erneut versuchen.",
    };
  }
}
export async function uploadPhoto(
  dataUrl: string,
  captchaToken: string,
): Promise<Result<{ url: string }>> {
  if (!databaseConfigured())
    return { ok: false, error: "Der Foto-Upload ist noch nicht eingerichtet." };
  try {
    const user = await currentUser();
    if (!user) {
      const reason = await publicGuard({ captchaToken }, "upload", 20);
      if (reason) return { ok: false, error: reason };
    } else if (!(await rateLimit(`upload:${user.id}`, 30, 3600)))
      return { ok: false, error: "Zu viele Fotos hochgeladen." };
    const bytes = await sanitiseImage(dataUrl);
    const path = `${user?.id || "guest"}/${randomUUID()}.webp`;
    const { error } = await db()
      .storage.from("parts-photos")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    return {
      ok: true,
      data: {
        url: db().storage.from("parts-photos").getPublicUrl(path).data
          .publicUrl,
      },
    };
  } catch {
    return {
      ok: false,
      error:
        "Das Bild konnte nicht verarbeitet werden. Bitte ein gültiges Foto auswählen.",
    };
  }
}
export async function confirmListing(
  token: string,
): Promise<Result<{ message: string }>> {
  const verified = verifyToken(token, "listing-confirm");
  if (!verified || !databaseConfigured())
    return { ok: false, error: "Dieser Link ist ungültig oder abgelaufen." };
  try {
    const { data, error } = await db().rpc("confirm_listing", {
      p_id: verified.subject,
      p_hash: hashToken(token),
    });
    if (error) throw error;
    if (!data)
      return {
        ok: false,
        error: "Dieser Link ist ungültig oder wurde bereits verwendet.",
      };
    await enqueueMatches();
    revalidatePath("/teile");
    return {
      ok: true,
      data: { message: "Dein Inserat ist jetzt veröffentlicht." },
    };
  } catch {
    return { ok: false, error: "Die Bestätigung ist derzeit nicht möglich." };
  }
}
export async function requestManagementLink(input: {
  email: string;
  captchaToken: string;
  ag_hp_field: string;
}): Promise<Result<{ message: string }>> {
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success)
    return { ok: false, error: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (!databaseConfigured() || !mailConfigured())
    return {
      ok: false,
      error: "Die Verwaltung per E-Mail ist noch nicht eingerichtet.",
    };
  try {
    const reason = await publicGuard(input, "magic-link");
    if (reason) return { ok: false, error: reason };
    if (!(await rateLimit(`magic-email:${hashToken(parsed.data)}`, 5, 3600)))
      return {
        ok: true,
        data: { message: "Falls es Inserate gibt, senden wir dir einen Link." },
      };
    const [items, wanted, trades] = await Promise.all([
      db()
        .from("parts_items")
        .select("id")
        .eq("guest_email", parsed.data)
        .not("email_confirmed_at", "is", null)
        .limit(1),
      db()
        .from("parts_wanted")
        .select("id")
        .eq("guest_email", parsed.data)
        .neq("status", "pending_email")
        .limit(1),
      db()
        .from("parts_trades")
        .select("id")
        .eq("requester_email", parsed.data)
        .is("requester_user_id", null)
        .limit(1),
    ]);
    if (items.error || wanted.error || trades.error)
      throw new Error("Lookup failed");
    if (items.data?.length || wanted.data?.length || trades.data?.length) {
      const token = issueToken(parsed.data, "management");
      const { error: rpcError } = await db().rpc("create_management_token", {
        p_hash: hashToken(token),
        p_subject: randomUUID(),
        p_mail: {
          recipient: parsed.data,
          subject: "Dein persönlicher Zugang",
          body: sealOutbox(
            `Verwalte deine Inserate über diesen persönlichen Link:\n${process.env.APP_ORIGIN}/teile/meine/${encodeURIComponent(token)}`,
          ),
        },
      });
      if (rpcError) throw rpcError;
    }
    return {
      ok: true,
      data: { message: "Falls es Inserate gibt, senden wir dir einen Link." },
    };
  } catch {
    return {
      ok: false,
      error: "Der Link konnte derzeit nicht angefordert werden.",
    };
  }
}
export async function openManagedTrade(
  tradeId: string,
  token?: string,
): Promise<Result<{ token: string }>> {
  if (!/^[a-f0-9-]{36}$/.test(tradeId))
    return { ok: false, error: "Ungültige Anfrage." };
  try {
    const { managementIdentity } = await import("@/lib/server/management");
    const identity = await managementIdentity(token);
    if (!identity)
      return {
        ok: false,
        error: "Bitte erneut anmelden oder einen Zugangslink anfordern.",
      };
    const { data: trade } = await db()
      .from("parts_trades")
      .select("id,item_id,requester_user_id,requester_email")
      .eq("id", tradeId)
      .maybeSingle();
    if (!trade) return { ok: false, error: "Anfrage nicht gefunden." };
    const { data: item } = await db()
      .from("parts_items")
      .select("owner_user_id,guest_email")
      .eq("id", trade.item_id)
      .maybeSingle();
    let role: "owner" | "requester" | null = null;
    if (identity.kind === "user") {
      if (item?.owner_user_id === identity.id) role = "owner";
      else if (trade.requester_user_id === identity.id) role = "requester";
    } else {
      if (item?.guest_email === identity.email && !item.owner_user_id)
        role = "owner";
      else if (
        trade.requester_email === identity.email &&
        !trade.requester_user_id
      )
        role = "requester";
    }
    if (!role)
      return {
        ok: false,
        error: "Diese Anfrage gehört nicht zu deinem Bereich.",
      };
    const purpose = `trade-${role}`;
    const access = issueToken(trade.id, purpose);
    const { error } = await db()
      .from("access_tokens")
      .insert({
        token_hash: hashToken(access),
        subject_id: trade.id,
        purpose,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    if (error) throw error;
    return { ok: true, data: { token: access } };
  } catch {
    return { ok: false, error: "Die Anfrage konnte nicht geöffnet werden." };
  }
}
export async function withdrawOwnedListing(
  itemId: string,
  token?: string,
): Promise<Result<{ message: string }>> {
  if (!/^[a-f0-9-]{36}$/.test(itemId))
    return { ok: false, error: "Ungültiges Inserat." };
  try {
    const { managementIdentity } = await import("@/lib/server/management");
    const identity = await managementIdentity(token);
    if (!identity) return { ok: false, error: "Bitte erneut anmelden." };
    const { data, error } = await db().rpc("withdraw_owned_listing", {
      p_item: itemId,
      p_user: identity.kind === "user" ? identity.id : null,
      p_email: identity.kind === "guest" ? identity.email : null,
    });
    if (error) throw error;
    revalidatePath("/teile");
    revalidatePath("/teile/meine");
    if (token) revalidatePath(`/teile/meine/${token}`);
    return data
      ? { ok: true, data: { message: "Inserat zurückgezogen." } }
      : { ok: false, error: "Dieses Inserat kann nicht zurückgezogen werden." };
  } catch {
    return {
      ok: false,
      error: "Das Inserat konnte nicht zurückgezogen werden.",
    };
  }
}
