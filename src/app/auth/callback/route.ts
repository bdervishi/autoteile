import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/lib/server/db";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const origin = process.env.APP_ORIGIN;
  if (
    !origin ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return new Response("Authentication not configured", { status: 503 });
  const code = new URL(request.url).searchParams.get("code");
  if (!code)
    return NextResponse.redirect(new URL("/teile/meine?auth=failed", origin));
  const jar = await cookies();
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
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(new URL("/teile/meine?auth=failed", origin));
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user?.email && user.email_confirmed_at) {
    const { error: linkError } = await db().rpc("link_verified_guests", {
      p_user: user.id,
    });
    if (linkError) console.error("Guest account linking failed");
  }
  return NextResponse.redirect(
    new URL(
      new URL(request.url).searchParams.get("next") === "admin"
        ? "/admin"
        : "/teile/meine",
      origin,
    ),
  );
}
