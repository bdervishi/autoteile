import { tradeAccess } from "@/lib/server/trade-access";
import { ConversationControls } from "@/components/conversation";
import { swissDate } from "@/lib/constants";
export const metadata = {
  title: "Dein Anfrage-Verlauf",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Trade({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const access = await tradeAccess(token);
  if (!access)
    return (
      <main id="main" className="container narrow">
        <h1>Zugangslink nicht gültig.</h1>
        <p>Der Link ist abgelaufen oder die Anfrage ist nicht verfügbar.</p>
      </main>
    );
  const labels: Record<string, string> = {
    requested: "Offen",
    accepted: "Zugesagt",
    declined: "Abgesagt",
    completed: "Abgeschlossen",
    cancelled: "Zurückgezogen",
  };
  return (
    <main id="main" className="container narrow">
      <div className="eyebrow">{labels[access.trade.status]}</div>
      <h1 style={{ marginTop: 12 }}>{access.item?.title || "Deine Anfrage"}</h1>
      <p>
        Deine E-Mail-Adresse bleibt verborgen. Du kannst hier oder direkt per
        Mail antworten.
      </p>
      {access.messages.map((m) => (
        <article key={m.id} className="panel">
          <strong>
            {m.sender_role === access.role
              ? "Du"
              : m.sender_role === "owner"
                ? "Anbieter"
                : "Interessierte Person"}
          </strong>
          <small className="muted" style={{ float: "right" }}>
            {swissDate(m.created_at)}
          </small>
          <p
            style={{
              whiteSpace: "pre-line",
              margin: "12px 0 0",
              color: "var(--ink)",
            }}
          >
            {m.body}
          </p>
        </article>
      ))}
      <ConversationControls
        token={token}
        role={access.role}
        status={access.trade.status}
      />
    </main>
  );
}
