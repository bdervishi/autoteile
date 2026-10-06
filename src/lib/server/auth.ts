import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function currentUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return null;
  const jar = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach((v) => jar.set(v.name, v.value, v.options));
          } catch {
            /* read-only RSC */
          }
        },
      },
    },
  );
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  return !error && user?.email_confirmed_at ? user : null;
}
