import Link from "next/link";
import { moderator } from "@/lib/server/admin";
import { databaseConfigured, db } from "@/lib/server/db";
import { COMMERCIAL_OFFERS } from "@/lib/monetization";
import { CommercialAdminControls } from "@/components/commercial-admin-controls";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kommerzielle Anfragen",
  robots: { index: false, follow: false },
};
export default async function CommercialAdmin() {
  const actor = await moderator();
  const preview = !databaseConfigured();
  if (!preview && actor?.role !== "admin")
    return (
      <main id="main" className="container narrow">
        <h1>Kommerzielle Anfragen</h1>
        <p>Dieser Bereich benötigt Administratorrechte.</p>
        <Link href="/admin">Zur Anmeldung</Link>
      </main>
    );
  const result = preview
    ? { data: [], error: null }
    : await db()
        .from("commercial_requests")
        .select("id,offer,name,email,note,status,quoted_price_chf,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
  return (
    <main id="main" className="container">
      <Link href="/admin">← Verwaltung</Link>
      <h1>Kommerzielle Anfragen</h1>
      <p>Händlerpakete, Boosts und Partneranfragen zentral bearbeiten.</p>
      <div className="admin-notice">
        <strong>
          {preview
            ? "Vorschau · Supabase noch nicht eingerichtet"
            : "Pilotphase · Keine automatischen Zahlungen"}
        </strong>
        <p>
          Vormerkungen sind keine Einnahmen. Eine akzeptierte Anfrage aktiviert
          weder ein Abo noch einen Boost. Rückmeldungen sendest du separat.
        </p>
      </div>
      {result.error ? (
        <p role="alert">Anfragen konnten nicht geladen werden.</p>
      ) : result.data?.length ? (
        result.data.map((r) => (
          <section className="panel" key={r.id}>
            <h2>
              {COMMERCIAL_OFFERS[r.offer as keyof typeof COMMERCIAL_OFFERS]
                ?.name || r.offer}
            </h2>
            <p>
              {r.name} · {r.email}
            </p>
            <p>{r.note}</p>
            <p>
              Status: {r.status} · Geplanter Preis CHF {r.quoted_price_chf}
            </p>
            <CommercialAdminControls id={r.id} />
          </section>
        ))
      ) : (
        <section className="panel">
          <h2>Noch keine Anfragen</h2>
          <p>Neue Pilotanfragen erscheinen hier nach der Einrichtung.</p>
        </section>
      )}
      <Link href="/preise">Öffentliche Preise ansehen</Link>
    </main>
  );
}
