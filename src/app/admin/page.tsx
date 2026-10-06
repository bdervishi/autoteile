import Link from "next/link";
import { AdminStatistics } from "@/components/admin-statistics";
import { LoginForm } from "@/components/login-form";
import { databaseConfigured } from "@/lib/server/db";
import { AdminOverview } from "@/components/admin-overview";
import { signOut } from "@/app/auth/actions";
import { moderator } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { SettingsForm } from "@/components/settings-form";
import { AdminControls } from "@/components/admin-controls";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const actor = await moderator();
  if (!actor)
    return (
      <main id="main" className="container admin-page">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">TEILEBÖRSE · VERWALTUNG</p>
            <h1>Alles im Blick.</h1>
            <p>Der zentrale Arbeitsbereich für deinen Marktplatz.</p>
          </div>
          <Link className="button" href="/">
            Zum Marktplatz
          </Link>
        </div>
        {!databaseConfigured() && (
          <>
            <div className="admin-notice">
              <strong>Vorschau · Supabase noch nicht eingerichtet</strong>
              <p>
                Die Übersicht zeigt Beispieldaten. Verwaltungsaktionen werden
                erst nach Einrichtung und Anmeldung freigeschaltet.
              </p>
            </div>
            <AdminStatistics preview />
            <AdminOverview preview />
            <p>
              <Link className="button" href="/admin/umsatz">
                Kommerzielle Verwaltung ansehen
              </Link>
            </p>
          </>
        )}
        <section className="panel admin-login">
          <h2>Admin-Anmeldung</h2>
          <p>
            Melde dich mit der E-Mail-Adresse deines Admin-Kontos an. Die
            Berechtigung wird auf dem Server geprüft.
          </p>
          <LoginForm redirectTo="/admin" />
        </section>
      </main>
    );
  const [reports, wanted, log, settings] = await Promise.all([
    db()
      .from("parts_reports")
      .select("id,reason,note,parts_items(title)")
      .eq("status", "open")
      .order("created_at")
      .limit(100),
    db()
      .from("parts_wanted")
      .select("id,group_id,group_title,note,auto_check")
      .eq("status", "pending_review")
      .order("created_at")
      .limit(100),
    db()
      .from("parts_moderation_log")
      .select("id,item_title,action,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    db().from("platform_settings").select("value").eq("id", true).single(),
  ]);
  return (
    <main id="main" className="container">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">TEILEBÖRSE · VERWALTUNG</p>
          <h1>Alles im Blick.</h1>
          <p>
            Angemeldet als{" "}
            {actor.role === "admin" ? "Administrator" : "Moderator"}.
          </p>
        </div>
        <form action={signOut}>
          <button className="button">Abmelden</button>
        </form>
      </div>
      {actor.role === "admin" && <AdminStatistics preview={false} />}
      <AdminOverview />
      {actor.role === "admin" && (
        <p>
          <Link className="button primary" href="/admin/umsatz">
            Kommerzielle Anfragen verwalten
          </Link>
        </p>
      )}
      <nav className="admin-nav" aria-label="Verwaltung">
        <a href="#meldungen">Meldungen</a>
        <a href="#gesuche">Gesuche</a>
        <a href="#einstellungen">Einstellungen</a>
        <a href="#protokoll">Protokoll</a>
      </nav>
      <div className="form-grid">
        <section>
          <h2 id="meldungen">Offene Meldungen</h2>
          {reports.data?.length ? (
            reports.data.map((r) => (
              <article className="panel" key={r.id}>
                <h3>
                  {(r.parts_items as unknown as { title: string })?.title}
                </h3>
                <p>
                  {r.reason} · {r.note}
                </p>
                <AdminControls id={r.id} kind="report" />
              </article>
            ))
          ) : (
            <p>Keine offenen Meldungen.</p>
          )}
        </section>
        <section>
          <h2 id="gesuche">Gesuche zur Prüfung</h2>
          {Array.from(
            new Map((wanted.data || []).map((w) => [w.group_id, w])).values(),
          ).map((w) => (
            <article className="panel" key={w.id}>
              <h3>{w.group_title}</h3>
              <p>{w.note}</p>
              <p className="hint">
                Vorprüfung:{" "}
                {Object.entries(w.auto_check || {})
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ") || "Keine Hinweise"}
              </p>
              <AdminControls id={w.id} kind="wanted" />
            </article>
          ))}
        </section>
      </div>
      {actor.role === "admin" && settings.data && (
        <section className="panel">
          <h2 id="einstellungen">Einstellungen</h2>
          <SettingsForm settings={settings.data.value} />
        </section>
      )}
      <h2 id="protokoll">Moderationsprotokoll</h2>
      {log.data?.map((l) => (
        <p key={l.id}>
          {l.item_title} · {l.action} · {l.reason}
        </p>
      ))}
    </main>
  );
}
