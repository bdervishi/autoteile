import { db, databaseConfigured } from "@/lib/server/db";
import { escapeHtml } from "@/lib/plain-text";
export const dynamic = "force-dynamic";
export async function GET() {
  const origin = process.env.APP_ORIGIN;
  if (!databaseConfigured() || !origin)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
      { headers: { "Content-Type": "application/xml" } },
    );
  const { data, error } = await db()
    .from("parts_items")
    .select("id,updated_at")
    .eq("status", "available")
    .is("moderation_hidden_at", null)
    .not("email_confirmed_at", "is", null)
    .order("id")
    .limit(50000);
  if (error)
    return new Response("Sitemap derzeit nicht verfügbar", { status: 503 });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${(data || []).map((i) => `<url><loc>${escapeHtml(origin)}/teile/${i.id}</loc><lastmod>${i.updated_at}</lastmod></url>`).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
