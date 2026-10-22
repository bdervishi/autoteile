import { CircleCheck, CircleAlert, CircleDashed } from "lucide-react";
import { db } from "@/lib/server/db";
import { launchChecks } from "@/lib/readiness";
// Admin-only: shows which services are configured and whether mail is flowing.
export async function AdminReadiness() {
  const checks = launchChecks(process.env);
  const blocking = checks.filter((c) => !c.ok && c.blocking).length;
  const [pending, failing] = await Promise.all([
    db()
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .is("sent_at", null),
    db()
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .is("sent_at", null)
      .not("last_error", "is", null),
  ]);
  return (
    <section className="panel admin-readiness" aria-labelledby="systemstatus">
      <h2 id="systemstatus">
        Systemstatus ·{" "}
        {blocking
          ? `${blocking} Punkt(e) blockieren Inserate`
          : "bereit für Inserate"}
      </h2>
      <ul>
        {checks.map((check) => (
          <li key={check.label}>
            {check.ok ? (
              <CircleCheck size={16} color="#236133" />
            ) : check.blocking ? (
              <CircleAlert size={16} color="#b3261e" />
            ) : (
              <CircleDashed size={16} color="#67717b" />
            )}
            <span>
              <b>
                {check.area} · {check.label}
              </b>
              {!check.ok && <small>{check.hint}</small>}
            </span>
          </li>
        ))}
        <li>
          {failing.count ? (
            <CircleAlert size={16} color="#b3261e" />
          ) : (
            <CircleCheck size={16} color="#236133" />
          )}
          <span>
            <b>
              E-Mail-Warteschlange · {pending.count ?? "?"} offen,{" "}
              {failing.count ?? "?"} mit Fehler
            </b>
            {!!failing.count && (
              <small>
                Zustellung schlägt fehl. SMTP-Zugang und Absenderadresse prüfen.
              </small>
            )}
          </span>
        </li>
      </ul>
    </section>
  );
}
