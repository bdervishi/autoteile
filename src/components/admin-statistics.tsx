import Link from "next/link";
import { adminStatistics } from "@/lib/server/admin-statistics";
export async function AdminStatistics({
  preview,
  days = 30,
}: {
  preview: boolean;
  days?: number;
}) {
  const s = await adminStatistics(preview, days);
  if (s.error)
    return (
      <p role="alert">Die Statistik konnte nicht vollständig geladen werden.</p>
    );
  const max = Math.max(1, ...s.trend.map((t) => Number(t.count)));
  return (
    <>
      <div className="admin-stats">
        {[
          {
            label: "Inserate insgesamt",
            value: s.items,
            href: "/admin/inserate",
          },
          {
            label: `Neue Inserate · ${days} Tage`,
            value: s.newItems,
            href: "/admin/inserate",
          },
          { label: "CRM-Kontakte", value: s.contacts, href: "/admin/crm" },
          { label: "Fällige Wiedervorlagen", value: s.due, href: "/admin/crm" },
        ].map((t) => (
          <Link href={t.href} key={t.label} className="panel">
            <span>{t.label}</span>
            <strong>{t.value}</strong>
            {preview && <small>Beispieldaten</small>}
          </Link>
        ))}
      </div>
      <section className="panel">
        <h2>Neue Inserate im Zeitverlauf</h2>
        <p className="hint">
          {preview
            ? "Beispielverlauf · keine echten Messwerte"
            : `Tageswerte der letzten ${days} Kalendertage, Zeitzone Schweiz.`}
        </p>
        <div
          className="stats-bars"
          role="img"
          aria-label="Neue Inserate: Tageswerte in der folgenden Tabelle"
        >
          {s.trend.map((t) => (
            <div key={t.day} title={`${t.day}: ${t.count}`}>
              <span style={{ height: `${(Number(t.count) / max) * 130}px` }} />
              <small>{s.trend.length <= 7 ? t.day.slice(-5) : ""}</small>
            </div>
          ))}
        </div>
        <details>
          <summary>Tageswerte als Tabelle</summary>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Neue Inserate</th>
              </tr>
            </thead>
            <tbody>
              {s.trend.map((t) => (
                <tr key={t.day}>
                  <td>{t.day}</td>
                  <td>{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
      <div className="form-grid">
        <section className="panel">
          <h2>Offene Aufgaben</h2>
          <p>
            <Link href="/admin#meldungen">{s.reports} Meldungen prüfen</Link>
          </p>
          <p>
            <Link href="/admin#gesuche">{s.wanted} Gesuchartikel prüfen</Link>
          </p>
          <p>
            <Link href="/admin/umsatz">{s.requests} neue Partneranfragen</Link>
          </p>
          <p>
            <Link href="/admin/crm">{s.due} Kontakte nachfassen</Link>
          </p>
        </section>
        <section className="panel">
          <h2>Marktplatz & Geschäft</h2>
          <p>{s.businesses} registrierte Anbieter</p>
          <p>Besucherzahlen werden noch nicht erfasst.</p>
          <p>
            Umsätze sind noch nicht messbar: Es gibt keine integrierte
            Zahlungsabrechnung. Anfragen werden nicht als Umsatz gezählt.
          </p>
        </section>
      </div>
    </>
  );
}
