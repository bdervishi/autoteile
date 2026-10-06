import Link from "next/link";
import { db } from "@/lib/server/db";
import { AdminEntryControls } from "./admin-entry-controls";

export async function AdminOverview({
  preview = false,
}: {
  preview?: boolean;
}) {
  const results = preview
    ? null
    : await Promise.all([
        db()
          .from("parts_items")
          .select(
            "id,title,status,pickup_canton,moderation_hidden_at,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(50),
        db()
          .from("businesses")
          .select("id,name,slug,city,uid_number,verified_at")
          .order("created_at", { ascending: false })
          .limit(50),
        db().from("parts_items").select("id", { count: "exact", head: true }),
        db()
          .from("parts_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        db()
          .from("parts_wanted")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_review"),
        db()
          .from("businesses")
          .select("id", { count: "exact", head: true })
          .is("verified_at", null),
      ]);
  if (results?.some((r) => r.error))
    return (
      <p role="alert" className="form-message">
        Die Verwaltungsdaten konnten nicht vollständig geladen werden. Bitte
        erneut versuchen.
      </p>
    );
  const items: {
    id: string;
    title: string;
    status: string;
    pickup_canton: string;
    moderation_hidden_at: string | null;
  }[] = preview
    ? [
        {
          id: "demo-1",
          title: "Winterräder 205/55 R16",
          status: "available",
          pickup_canton: "ZH",
          moderation_hidden_at: null,
        },
        {
          id: "demo-2",
          title: "Dachträger für VW Golf",
          status: "available",
          pickup_canton: "BE",
          moderation_hidden_at: "preview",
        },
      ]
    : results![0].data || [];
  const businesses: {
    id: string;
    name: string;
    slug: string;
    city: string;
    uid_number: string;
    verified_at: string | null;
  }[] = preview
    ? [
        {
          id: "demo-business",
          name: "Beispiel-Garage",
          slug: "",
          city: "Zürich",
          uid_number: "Beispieldaten",
          verified_at: null,
        },
      ]
    : results![1].data || [];
  const counts = preview
    ? [24, 2, 3, 1]
    : results!.slice(2).map((r) => r.count ?? 0);
  return (
    <>
      <div className="admin-stats">
        {[
          "Inserate insgesamt",
          "Offene Meldungen",
          "Gesuchartikel zur Prüfung",
          "Ungeprüfte Anbieter",
        ].map((label, i) => (
          <article className="panel" key={label}>
            <span>{label}</span>
            <strong>{counts[i]}</strong>
            {preview && <small>Beispieldaten</small>}
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="admin-section-heading">
          <h2>Inserate</h2>
          <span>Neueste 50 Einträge</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Inserat</th>
                <th>Kanton</th>
                <th>Status</th>
                <th>Verwaltung</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {preview ? (
                      item.title
                    ) : (
                      <Link href={`/teile/${item.id}`}>{item.title}</Link>
                    )}
                  </td>
                  <td>{item.pickup_canton}</td>
                  <td>
                    <span className="admin-badge">
                      {item.moderation_hidden_at
                        ? "Ausgeblendet"
                        : {
                            available: "Verfügbar",
                            reserved: "Reserviert",
                            completed: "Abgeschlossen",
                            withdrawn: "Zurückgezogen",
                          }[
                            item.status as
                              | "available"
                              | "reserved"
                              | "completed"
                              | "withdrawn"
                          ] || item.status}
                    </span>
                  </td>
                  <td>
                    {preview ? (
                      <span className="hint">Nach Anmeldung verfügbar</span>
                    ) : (
                      <AdminEntryControls
                        id={item.id}
                        kind="item"
                        hidden={!!item.moderation_hidden_at}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && <p>Noch keine Inserate.</p>}
      </section>
      <section className="panel">
        <div className="admin-section-heading">
          <h2>Anbieter prüfen</h2>
          <span>Neueste 50 Anbieter</span>
        </div>
        {businesses.map((b) => (
          <article className="admin-business" key={b.id}>
            <div>
              <h3>
                {preview ? (
                  b.name
                ) : (
                  <Link href={`/anbieter/${b.slug}`}>{b.name}</Link>
                )}
              </h3>
              <p>
                {b.city} · {b.uid_number}
              </p>
              <span className="admin-badge">
                {b.verified_at ? "Geprüft" : "Ungeprüft"}
              </span>
            </div>
            {preview ? (
              <span className="hint">Nach Anmeldung verfügbar</span>
            ) : (
              <AdminEntryControls
                id={b.id}
                kind="business"
                hidden={!!b.verified_at}
              />
            )}
          </article>
        ))}
        {!businesses.length && <p>Noch keine Anbieter.</p>}
      </section>
    </>
  );
}
