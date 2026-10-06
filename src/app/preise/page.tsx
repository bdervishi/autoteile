import Link from "next/link";
import { COMMERCIAL_OFFERS } from "@/lib/monetization";
export const metadata = { title: "Preise & Händlerpakete" };
export default function Prices() {
  return (
    <main id="main" className="container">
      <div className="pricing-hero">
        <p className="eyebrow">FAIRE PREISE · SCHWEIZ</p>
        <h1>Privat gratis. Gewerblich mehr Möglichkeiten.</h1>
        <p>
          Gute Teile sollen weiterfahren. Privatinserate, Tauschen und
          Verschenken bleiben kostenlos.
        </p>
        <div className="inline-links">
          <Link className="button primary" href="/teile/neu">
            Gratis inserieren
          </Link>
          <Link className="button" href="/partner">
            Pilotpartner werden
          </Link>
        </div>
      </div>
      <div className="admin-notice">
        <strong>Wir starten mit Pilotpartnern.</strong>
        <p>
          Die folgenden Preise sind geplante Startpreise. Anfragen sind
          unverbindlich; bezahlte Pakete und Boosts werden erst nach technischer
          Freischaltung und Vereinbarung angeboten.
        </p>
      </div>
      <div className="pricing-grid">
        {(["starter", "pro", "plus"] as const).map((key) => (
          <section
            key={key}
            className={`panel pricing-card ${key === "pro" ? "pricing-featured" : ""}`}
          >
            <p className="eyebrow">
              {key === "pro"
                ? "FÜR WACHSENDE BESTÄNDE"
                : "FÜR GEWERBLICHE ANBIETER"}
            </p>
            <h2>{COMMERCIAL_OFFERS[key].name}</h2>
            <p className="pricing-amount">
              CHF {COMMERCIAL_OFFERS[key].price}
              <small> / Monat geplant</small>
            </p>
            <ul>
              <li>Firmenprofil und direkte Anfragen</li>
              <li>
                Geplant: bis zu {COMMERCIAL_OFFERS[key].limit} aktive Inserate
              </li>
              {key !== "starter" && (
                <>
                  <li>Geplant: CSV-Bestandsimport und Auswertungen</li>
                  <li>
                    Geplant:{" "}
                    {key === "pro"
                      ? "3 Boosts pro Monat"
                      : "Zugänge für mehrere Mitarbeitende"}
                  </li>
                </>
              )}
              {key === "plus" && <li>Unterstützung beim Bestandsimport</li>}
            </ul>
            <Link className="button primary" href={`/partner?angebot=${key}`}>
              Pilotpaket anfragen
            </Link>
          </section>
        ))}
      </div>
      <div className="form-grid">
        <section className="panel">
          <h2>Ein Teil. Mehr Sichtbarkeit.</h2>
          <p className="pricing-amount">
            CHF 5.90<small> / 7 Tage geplant</small>
          </p>
          <p>
            Zusätzliche, als hervorgehoben gekennzeichnete Platzierung in
            passenden Suchergebnissen. Kein Verkaufsversprechen.
          </p>
          <Link className="button" href="/partner?angebot=boost">
            Boost vormerken
          </Link>
        </section>
        <section className="panel">
          <h2>In deiner Region präsent.</h2>
          <p className="pricing-amount">
            Ab CHF 150<small> / Monat geplant</small>
          </p>
          <p>
            Regionale Sponsoringplätze für Garagen und Reifenbetriebe.
            Verfügbarkeit und Reichweite besprechen wir individuell.
          </p>
          <Link className="button" href="/partner?angebot=sponsor">
            Sponsoring anfragen
          </Link>
        </section>
      </div>
      <section className="panel">
        <h2>Montage und Zubehör gemeinsam anbieten.</h2>
        <p>
          Wir suchen Partnergaragen für Einbau und Reifenmontage sowie
          Zubehörpartner. Vermittlungsvergütung und Kennzeichnung vereinbaren
          wir vor dem Start.
        </p>
        <Link className="button" href="/partner?angebot=montage">
          Partner werden
        </Link>
      </section>
      <section className="panel">
        <h2>Was gilt heute?</h2>
        <p>
          Private Angebote sind kostenlos. Aktuell erheben wir keine
          Verkaufsprovision. Direkte Zahlungen zwischen Käufer und Verkäufer
          bleiben direkt. Ein integrierter Checkout mit Provision ist für eine
          spätere Ausbaustufe vorgesehen.
        </p>
        <p>
          Ein Anbieter-Prüfsiegel setzt eine tatsächliche Prüfung voraus. Es
          wird nicht durch den Kauf eines Pakets vergeben.
        </p>
      </section>
    </main>
  );
}
