import Link from "next/link";
import { adminAccess } from "@/lib/server/admin-access";
import { db } from "@/lib/server/db";
import { CRM_STAGES } from "@/lib/crm.schemas";
import {
  CrmContactForm,
  CrmNoteForm,
  type ContactFields,
} from "@/components/crm-contact-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "CRM & Kontakte",
  robots: { index: false, follow: false },
};
export default async function Crm({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { allowed, preview } = await adminAccess(true);
  if (!allowed)
    return (
      <main id="main" className="container">
        <h1>CRM & Kontakte</h1>
        <p>Administratorrechte erforderlich.</p>
        <Link href="/admin">Anmelden</Link>
      </main>
    );
  const p = await searchParams;
  const stage = p.phase && p.phase in CRM_STAGES ? p.phase : "";
  const q = (p.q || "").trim().slice(0, 120);
  let query = preview
    ? null
    : db()
        .from("crm_contacts")
        .select("id,name,email,company,phone,stage,note,next_contact_at")
        .order("updated_at", { ascending: false })
        .limit(200);
  if (query && stage) query = query.eq("stage", stage);
  if (query && q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const result = query
    ? await query
    : {
        data: [
          {
            id: "demo-crm-1",
            name: "Beispielkontakt",
            email: "kontakt@example.test",
            company: "Beispiel-Garage",
            phone: "",
            stage: "pilot",
            note: "Beispieldaten · Interesse am Händlerpaket",
            next_contact_at: null,
          },
        ],
        error: null,
      };
  const contacts: ContactFields[] = result.data || [];
  const selected =
    !preview && p.kontakt ? contacts.find((c) => c.id === p.kontakt) : null;
  const activity = selected
    ? await db()
        .from("crm_activity")
        .select("id,kind,body,created_at")
        .eq("contact_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };
  return (
    <main id="main" className="container admin-page">
      <p className="eyebrow">BEZIEHUNGEN PFLEGEN</p>
      <h1>CRM & Kontakte</h1>
      <p>
        Kontaktphasen, Gesprächsnotizen und Wiedervorlagen für deine Partner.
      </p>
      {preview && (
        <div className="admin-notice">
          Vorschau · Beispieldaten, Änderungen deaktiviert.
        </div>
      )}
      <form className="admin-filter" action="/admin/crm">
        <label>
          Kontaktname
          <input name="q" defaultValue={q} placeholder="Kontakt suchen" />
        </label>
        <label>
          Phase
          <select name="phase" defaultValue={stage}>
            <option value="">Alle Phasen</option>
            {Object.entries(CRM_STAGES).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button className="button">Filtern</button>
      </form>
      <div className="crm-pipeline">
        {Object.entries(CRM_STAGES).map(([v, l]) => (
          <Link href={`/admin/crm?phase=${v}`} key={v}>
            <strong>{l}</strong>
            <span>{contacts.filter((c) => c.stage === v).length}</span>
          </Link>
        ))}
      </div>
      <p className="hint">
        Phasenzahlen beziehen sich auf die angezeigten Kontakte, maximal 200.
      </p>
      <section className="panel">
        <h2>Kontaktübersicht</h2>
        {result.error ? (
          <p role="alert">Kontakte konnten nicht geladen werden.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kontakt</th>
                  <th>Phase</th>
                  <th>Wiedervorlage</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {contacts
                  .filter(
                    (c) =>
                      !preview ||
                      ((!stage || c.stage === stage) &&
                        (!q || c.name.toLowerCase().includes(q.toLowerCase()))),
                  )
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <br />
                        {c.company}
                        <br />
                        {c.email}
                      </td>
                      <td>{CRM_STAGES[c.stage]}</td>
                      <td>{c.next_contact_at || "Nicht geplant"}</td>
                      <td>
                        {preview ? (
                          "Vorschau"
                        ) : (
                          <Link href={`/admin/crm?kontakt=${c.id}`}>
                            Öffnen
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel">
        <h2>{selected ? "Kontakt bearbeiten" : "Kontakt anlegen"}</h2>
        <CrmContactForm
          key={selected?.id || "new"}
          contact={selected || undefined}
          disabled={preview}
        />
      </section>
      {selected && (
        <section className="panel">
          <h2>Gesprächsverlauf</h2>
          <CrmNoteForm id={selected.id} />
          {activity.data?.map((a) => (
            <article className="crm-activity" key={a.id}>
              <small>
                {new Date(a.created_at).toLocaleString("de-CH", {
                  timeZone: "Europe/Zurich",
                })}
              </small>
              <p>{a.body}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
