import { notFound } from "next/navigation";
import { db, databaseConfigured } from "@/lib/server/db";
import { PUBLIC_ITEM_COLUMNS, publicItemDTO } from "@/lib/public-dto";
import { ItemCard } from "@/components/item-card";
export const dynamic = "force-dynamic";
export default async function BusinessProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!databaseConfigured() || !/^[-a-z0-9]{1,80}$/.test(slug)) notFound();
  const { data: business } = await db()
    .from("businesses")
    .select(
      "id,slug,name,address,zip,city,canton,uid_number,website,logo_url,verified_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!business) notFound();
  const { data } = await db()
    .from("parts_items")
    .select(PUBLIC_ITEM_COLUMNS)
    .eq("business_id", business.id)
    .eq("owner_type", "business")
    .eq("status", "available")
    .is("moderation_hidden_at", null)
    .not("email_confirmed_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(24);
  return (
    <main id="main" className="container">
      <span className="business-badge">
        Gewerblicher Anbieter{business.verified_at ? " · Firma geprüft" : ""}
      </span>
      <h1 style={{ marginTop: 18 }}>{business.name}</h1>
      <p>
        {business.address}
        <br />
        {business.zip} {business.city} · {business.canton}
        <br />
        UID {business.uid_number}
      </p>
      {business.website && (
        <a
          className="text-link"
          href={business.website}
          rel="noopener noreferrer"
        >
          Website des Anbieters
        </a>
      )}
      <h2 style={{ marginTop: 35 }}>Aktuelle Angebote</h2>
      <div className="grid">
        {(data || []).map((row) => {
          const item = publicItemDTO(row);
          return <ItemCard key={item.id} item={item} />;
        })}
      </div>
    </main>
  );
}
