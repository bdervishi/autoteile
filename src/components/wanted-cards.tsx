import Link from "next/link";
import { db, databaseConfigured } from "@/lib/server/db";
import { CATEGORY_LABELS, chf } from "@/lib/constants";
import { CategoryIcon } from "./icons";
export async function WantedCards() {
  if (!databaseConfigured())
    return (
      <div className="empty">
        <h2>Was fehlt in deiner Garage?</h2>
        <p>Gesuche erscheinen hier nach E-Mail-Bestätigung und Freigabe.</p>
        <Link className="button primary" href="/teile/gesuch/neu">
          Gesuch aufgeben
        </Link>
      </div>
    );
  const { data, error } = await db()
    .from("parts_wanted")
    .select(
      "id,group_id,group_title,category,make,model,year,oem_number,min_condition,offer,max_price_chf,note,pickup_zip",
    )
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(120);
  if (error)
    return (
      <div className="form-message" role="alert">
        Gesuche konnten nicht geladen werden.
      </div>
    );
  const groups = new Map<string, NonNullable<typeof data>>();
  for (const row of data || [])
    groups.set(row.group_id, [...(groups.get(row.group_id) || []), row]);
  if (!groups.size)
    return (
      <div className="empty">
        <h2>Noch kein passendes Gesuch?</h2>
        <Link className="button primary" href="/teile/gesuch/neu">
          Gesuch aufgeben
        </Link>
      </div>
    );
  return (
    <div className="grid">
      {Array.from(groups.values()).map((rows) => (
        <article className="panel" key={rows[0].group_id}>
          <h3>{rows[0].group_title}</h3>
          <p className="hint">Abholregion {rows[0].pickup_zip}</p>
          {rows.map((row) => (
            <div
              key={row.id}
              style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}
            >
              <CategoryIcon category={row.category} />
              <strong>
                {CATEGORY_LABELS[row.category as keyof typeof CATEGORY_LABELS]}
              </strong>
              <p className="hint">
                {[row.make, row.model, row.oem_number]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {row.max_price_chf && (
                <p className="hint">Bis {chf(Number(row.max_price_chf))}</p>
              )}
              <Link
                className="button small"
                href={`/teile/neu?wanted=${row.id}`}
              >
                Ich habe das
              </Link>
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}
