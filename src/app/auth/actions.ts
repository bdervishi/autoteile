"use server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { emailSchema } from "@/lib/listing.schemas";
import { publicGuard } from "@/lib/server/guard";
import { databaseConfigured } from "@/lib/server/db";
import type { Result } from "@/lib/listing.types";
export async function signIn(input: {
  email: string;
  redirectTo?: "/admin";
  captchaToken: string;
  ag_hp_field: string;
}): Promise<Result<{ message: string }>> {
  const email = emailSchema.safeParse(input.email);
  if (!email.success)
    return { ok: false, error: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (!databaseConfigured() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return { ok: false, error: "Konten sind noch nicht eingerichtet." };
  try {
    const rejection = await publicGuard(input, "login");
    if (rejection) return { ok: false, error: rejection };
    const jar = await cookies();
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => jar.getAll(),
          setAll: (values) =>
            values.forEach((v) => jar.set(v.name, v.value, v.options)),
        },
      },
    );
    const { error } = await client.auth.signInWithOtp({
      email: email.data,
      options: {
        emailRedirectTo: `${process.env.APP_ORIGIN}/auth/callback${input.redirectTo === "/admin" ? "?next=admin" : ""}`,
      },
    });
    if (error)
      return {
        ok: false,
        error: "Der Anmeldelink konnte derzeit nicht angefordert werden.",
      };
    return {
      ok: true,
      data: {
        message:
          "Prüfe deine E-Mail. Du erhältst einen Link zum Anmelden oder Erstellen deines Kontos.",
      },
    };
  } catch {
    return {
      ok: false,
      error: "Der Anmeldelink konnte derzeit nicht angefordert werden.",
    };
  }
}
export async function signOut(): Promise<void> {
  const jar = await cookies();
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return;
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) =>
          values.forEach((v) => jar.set(v.name, v.value, v.options)),
      },
    },
  );
  await client.auth.signOut();
}
