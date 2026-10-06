export const metadata = { title: "Datenschutz", robots: { index: false } };
export default function Privacy() {
  return (
    <main id="main" className="container legal">
      <h1>Datenschutz</h1>
      <div className="demo-note">
        Die Datenschutzerklärung wird vor dem öffentlichen Start vom Betreiber
        freigegeben.
      </div>
      <p>
        Geplant sind Vercel für Hosting und Supabase für Datenbank, Anmeldung
        und Fotos. Weitere eingesetzte Dienste, Datenstandorte, Zwecke,
        Aufbewahrungsfristen und Kontakt für Datenschutzanfragen werden nach der
        Einrichtung ergänzt.
      </p>
      <p>Diese Seite ist noch keine vollständige Datenschutzerklärung.</p>
    </main>
  );
}
