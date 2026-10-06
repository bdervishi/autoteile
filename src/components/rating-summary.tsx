import { db, databaseConfigured } from "@/lib/server/db";
export async function RatingSummary({ itemId }: { itemId: string }) {
  if (!databaseConfigured()) return null;
  const { data, error } = await db().rpc("public_seller_rating", {
    p_item: itemId,
  });
  if (error || !data?.count)
    return <p className="hint">Noch keine Bewertungen.</p>;
  return (
    <p>
      {data.average} / 5 · {data.count} Bewertungen
      {data.count >= 20 && (
        <>
          <br />
          <strong>Verifiziert durch mindestens 20 Bewertungen</strong>
        </>
      )}
    </p>
  );
}
