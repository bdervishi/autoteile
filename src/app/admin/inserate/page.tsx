import Link from "next/link";
import { adminAccess } from "@/lib/server/admin-access";
import { db } from "@/lib/server/db";
import { AdminEntryControls } from "@/components/admin-entry-controls";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Inserateübersicht",
  robots: { index: false, follow: false },
};
export default async function Listings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { allowed, preview } = await adminAccess();
  if (!allowed)
    return (
      <main id="main" className="container">
        <h1>Inserateübersicht</h1>
        <p>Moderationsrechte erforderlich.</p>
        <Link href="/admin">Anmelden</Link>
      </main>
    );
  const p = await searchParams;
  const statuses: Record<string, string> = {
    available: "Verfügbar",
    reserved: "Reserviert",
    completed: "Abgeschlossen",
    withdrawn: "Zurückgezogen",
  };
  const status = p.status && p.status in statuses ? p.status : "";
  const q = (p.q || "").trim().slice(0, 120);
  const page = Math.min(10000, Math.max(1, parseInt(p.seite || "1") || 1));
  let query = preview
    ? null
    : db()
        .from("parts_items")
        .select(
          "id,title,owner_name,owner_type,status,pickup_canton,created_at,moderation_hidden_at,email_confirmed_at",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range((page - 1) * 25, page * 25 - 1);
  if (query && status) query = query.eq("status", status);
  if (query && q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  if (query && p.sichtbarkeit === "hidden")
    query = query.not("moderation_hidden_at", "is", null);
  if (query && p.sichtbarkeit === "visible")
    query = query.is("moderation_hidden_at", null);
  const result = query
    ? await query
    : {
        data: [
          {
            id: "demo-listing",
            title: "Beispiel: Winterräder 205/55 R16",
            owner_name: "Beispielanbieter",
            owner_type: "private",
            status: "available",
            pickup_canton: "ZH",
            created_at: "2026-10-03T10:00:00Z",
            moderation_hidden_at: null,
            email_confirmed_at: "preview",
          },
        ],
        count: 1,
        error: null,
      };
  const link = (n: number) => {
    const s = new URLSearchParams({
      q,
      status,
      sichtbarkeit: p.sichtbarkeit || "",
      seite: String(n),
    });
    return `/admin/inserate?${s}`;
  };
  return (
    <main id="main" className="container">
      <p className="eyebrow">ANGEBOTE VERWALTEN</p>
      <h1>Inserateübersicht</h1>
      <p>
        Alle Zustände, einschliesslich ausgeblendeter und unbestätigter
        Inserate.
      </p>
      {preview && (
        <div className="admin-notice">
          Vorschau · Beispieldaten, Verwaltungsaktionen deaktiviert.
        </div>
      )}
      <form className="admin-filter" action="/admin/inserate">
        <label>
          Titel
          <input name="q" defaultValue={q} placeholder="Inserat suchen" />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">Alle Status</option>
            {Object.entries(statuses).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sichtbarkeit
          <select name="sichtbarkeit" defaultValue={p.sichtbarkeit || ""}>
            <option value="">Alle</option>
            <option value="hidden">Ausgeblendet</option>
            <option value="visible">Nicht ausgeblendet</option>
          </select>
        </label>
        <button className="button">Filtern</button>
      </form>
      <section className="panel">
        <h2>{result.count ?? 0} Inserate</h2>
        {result.error ? (
          <p role="alert">Inserate konnten nicht geladen werden.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Inserat</th>
                  <th>Anbieter</th>
                  <th>Status</th>
                  <th>Sichtbarkeit</th>
                  <th>Verwaltung</th>
                </tr>
              </thead>
              <tbody>
                {result.data
                  ?.filter(
                    (i) =>
                      !preview ||
                      ((!status || i.status === status) &&
                        (!q ||
                          i.title.toLowerCase().includes(q.toLowerCase())) &&
                        p.sichtbarkeit !== "hidden"),
                  )
                  .map((i) => (
                    <tr key={i.id}>
                      <td>
                        {preview ? (
                          i.title
                        ) : (
                          <Link href={`/teile/${i.id}`}>{i.title}</Link>
                        )}
                        <br />
                        <small>
                          {i.pickup_canton} ·{" "}
                          {new Date(i.created_at).toLocaleDateString("de-CH", {
                            timeZone: "Europe/Zurich",
                          })}
                        </small>
                      </td>
                      <td>
                        {i.owner_name}
                        <br />
                        <small>{i.owner_type}</small>
                      </td>
                      <td>{statuses[i.status]}</td>
                      <td>
                        {i.moderation_hidden_at
                          ? "Ausgeblendet"
                          : i.email_confirmed_at
                            ? "Bestätigt"
                            : "E-Mail unbestätigt"}
                      </td>
                      <td>
                        {preview ? (
                          "Vorschau"
                        ) : (
                          <AdminEntryControls
                            id={i.id}
                            kind="item"
                            hidden={!!i.moderation_hidden_at}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <nav className="inline-links" aria-label="Inseratseiten">
          {page > 1 && <Link href={link(page - 1)}>← Zurück</Link>}
          <span>Seite {page}</span>
          {page * 25 < (result.count || 0) && (
            <Link href={link(page + 1)}>Weiter →</Link>
          )}
        </nav>
      </section>
    </main>
  );
}
