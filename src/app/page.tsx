import { TireFinder } from "@/components/tire-finder";
import Link from "next/link";
import { LandingRuntime } from "@/components/landing-runtime";
import {
  ShieldCheck,
  MapPin,
  Mail,
  Gift,
  Repeat2,
  CreditCard,
  Banknote,
  Check,
} from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, CANTONS } from "@/lib/constants";
import { CategoryIcon } from "@/components/icons";
export default function Home() {
  return (
    <main id="main" className="landing-page">
      <section
        className="hero"
        data-sc-act="pin"
        data-sc-span="2.7"
        data-sc-verify-state="0"
      >
        <div className="sc-stage" style={{ width: "100%" }}>
          <img
            className="hero-image hero-image--before"
            src="/landing/keller-plate-v2.webp"
            alt="Leerer Keller mit Platz für ungenutzte Autoteile"
          />
          <img
            className="hero-image hero-image--after"
            data-sc-reveal="left"
            data-sc-reveal-at="0.03 0.86"
            src="/landing/garage.webp"
            alt="Winterräder in einer Garage mit Blick auf die Schweizer Berge"
          />
          <div className="wheel-plane">
            <img
              src="/landing/wheel-cutout-v2.webp"
              alt="Ein Winterrad bereit für seine nächste Verwendung"
            />
            <span className="wheel-ground" />
          </div>
          <span className="hero-scene-label" aria-hidden="true">
            <span>Abgestellt.</span>
            <span>Weitergebracht.</span>
          </span>
          <div className="hero-copy">
            <div className="eyebrow">Autoteile weitergeben. Schweizweit.</div>
            <h1 style={{ marginTop: 24 }}>
              Steht im Keller.
              <br />
              <span>Fehlt in der Garage.</span>
            </h1>
            <p>
              Was bei dir herumliegt, bringt jemand anderen weiter. Finde,
              tausche und verkaufe Autoteile in deiner Nähe.
            </p>
            <div className="hero-actions">
              <Link href="/teile" className="button primary">
                Zur Teilebörse
              </Link>
              <Link href="/teile/neu" className="button">
                Teil inserieren
              </Link>
            </div>
            <p className="hero-payoff" aria-hidden="true">
              Bereit für die nächste Runde.
            </p>
            <div className="hero-foot">
              <span>Stöbern ohne Login</span>
              <span>Von privat und von der Garage</span>
            </div>
          </div>
        </div>
      </section>
      <div className="intro-strip">
        <div>
          <ShieldCheck size={20} />
          Deine E-Mail bleibt verborgen
        </div>
        <div>
          <MapPin size={20} />
          In der ganzen Schweiz
        </div>
        <div>
          <Repeat2 size={20} />
          Tausch, Gratis oder Verkauf
        </div>
      </div>
      <section className="landing-section give-station" data-sc-act="flow">
        <div data-sc-in>
          <h2 data-sc-kinetic="lines" data-sc-cue="0.02 1 0.18 0">
            Foto, Fahrzeug, Zustand. Fertig.
          </h2>
          <p>
            Die Felgen nach dem Fahrzeugwechsel. Der Dachträger, den du kaum
            brauchst. Gib guten Teilen eine zweite Runde.
          </p>
          <p>
            Bis zu 5 Fotos, ein paar Angaben und dein Abholort. Du entscheidest,
            ob du auch versendest.
          </p>
          <Link href="/teile/neu" className="button primary">
            Jetzt inserieren
          </Link>
        </div>
        <div className="tile-grid">
          {CATEGORIES.slice(0, 9).map((c, index) => (
            <Link
              key={c}
              href={`/teile?category=${c}`}
              className="tile"
              data-sc-in
              style={{ transitionDelay: `${index * 65}ms` }}
            >
              <CategoryIcon category={c} />
              {CATEGORY_LABELS[c]}
            </Link>
          ))}
        </div>
      </section>
      <div className="landing-soft">
        <section className="landing-section search-station" data-sc-act="flow">
          <div className="finder-surface">
            <TireFinder />
          </div>
          <div>
            <h2>
              205/55 R16.
              <br />
              In der Nähe.
            </h2>
            <p>
              Suche nach deinem Fahrzeug, der Reifengrösse oder einer
              Original-Teilenummer. Grenze nach Kanton, Zustand und Preis ein.
            </p>
            <Link href="/teile" className="text-link">
              Alle Angebote ansehen
            </Link>
          </div>
        </section>
      </div>
      <section className="landing-offers" data-sc-act="pan" data-sc-span="2.1">
        <div className="sc-stage">
          <div className="offer-rail" data-sc-pan="0">
            <div className="offer-title">
              <h2>
                Dein Teil.
                <br />
                Deine Entscheidung.
              </h2>
              <p>Vier Wege zur nächsten Garage.</p>
            </div>
            {[
              {
                Icon: Repeat2,
                title: "Tauschen",
                copy: "Ein Teil gegen ein anderes. Besprecht euer Gegenangebot direkt im Verlauf.",
              },
              {
                Icon: Gift,
                title: "Verschenken",
                copy: "Noch gut, aber nicht mehr gebraucht? Mach jemandem eine Freude.",
              },
              {
                Icon: CreditCard,
                title: "Online verkaufen",
                copy: "TWINT direkt ohne Plattform-Gebühr. Deine Nummer gibst du persönlich frei. Kartenzahlung folgt nach Einrichtung.",
              },
              {
                Icon: Banknote,
                title: "Bar bei Abholung",
                copy: "Teil anschauen, Übergabe absprechen und vor Ort bezahlen.",
              },
            ].map(({ Icon, title, copy }) => (
              <article className="panel" key={title} data-sc-tilt="5">
                <Icon size={28} />
                <h3>{title}</h3>
                <p style={{ marginBottom: 0 }}>{copy}</p>
              </article>
            ))}
            <div className="offer-note">
              <p>
                Ihr vereinbart die Übergabe.
                <br />
                Du bestimmst den Weg.
              </p>
              <Link href="/teile/neu" className="button">
                Teil inserieren
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="canton-section" data-sc-act="pin" data-sc-span="1.45">
        <div className="sc-stage">
          <h2>
            Von deiner Garage
            <br />
            in die ganze Schweiz.
          </h2>
          <p>Stöbere in deinem Kanton oder schau über die Kantonsgrenze.</p>
          <div
            className="cantons"
            data-sc-reveal="up"
            data-sc-reveal-at="0 0.68"
          >
            {CANTONS.map((c) => (
              <Link key={c} href={`/teile?canton=${c}`}>
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="landing-section" data-sc-act="flow">
        <div>
          <h2>
            Eine E-Mail.
            <br />
            Alles im Griff.
          </h2>
          <p>
            Inseriere als Gast. Deinen persönlichen Verwaltungslink erhältst du
            per E-Mail. Deine Adresse bleibt für die Gegenseite verborgen.
          </p>
          <Link className="button" href="/teile/meine">
            Meinen Zugangslink anfordern
          </Link>
        </div>
        <div className="panel" data-sc-in>
          <Mail size={34} color="#ee5b27" />
          <h3 style={{ marginTop: 22 }}>Dein Inserat ist bereit.</h3>
          <p>
            Bestätige deine E-Mail-Adresse mit einem Klick. Erst danach wird
            dein Inserat sichtbar.
          </p>
          <div className="hint">
            <Check size={16} style={{ display: "inline" }} /> Keine Passwörter
            für Gäste
          </div>
        </div>
      </section>
      <div className="landing-soft">
        <section className="landing-section" data-sc-act="flow">
          <div>
            <h2>
              Mehr Platz.
              <br />
              Auch im Lager.
            </h2>
            <p>
              Die Plattform ist auch für Garagen, Händler und Pneuhäuser
              vorgesehen: mit eigenem Firmenprofil und gewerblichem Badge. Der
              Sammel-Import folgt.
            </p>
            <p className="hint">
              Gewerbliche Konten werden nach Einrichtung der Plattform
              freigeschaltet.
            </p>
          </div>
          <div>
            <h2>
              Fehlt noch
              <br />
              das richtige Teil?
            </h2>
            <p>
              Gib ein Gesuch auf. Nach Freigabe melden wir uns per E-Mail,
              sobald ein passendes Inserat erscheint.
            </p>
            <Link href="/teile/gesuch/neu" className="button primary">
              Gesuch aufgeben
            </Link>
          </div>
        </section>
      </div>
      <section className="landing-section" data-sc-act="flow">
        <div>
          <h2>
            Gute Teile.
            <br />
            Klare Absprachen.
          </h2>
          <p>
            Anfragen und Antworten bleiben in einem Verlauf. Persönliche
            Kontaktdaten werden geschützt; auffällige Inserate kannst du melden.
          </p>
        </div>
        <div className="panel" data-sc-in>
          <ShieldCheck size={36} color="#ee5b27" />
          <h3 style={{ marginTop: 20 }}>Persönliches bleibt persönlich.</h3>
          <p>
            Deine E-Mail-Adresse ist nie öffentlich. Deine TWINT-Nummer erhält
            nur die Person, für die du sie ausdrücklich freigibst.
          </p>
        </div>
      </section>
      <section className="closing" data-sc-act="flow">
        <div className="sc-stage">
          <h2 data-sc-in>
            Dein nächstes Teil
            <br />
            wartet vielleicht schon.
          </h2>
          <div className="inline-links">
            <Link href="/teile" className="button primary">
              Zur Teilebörse
            </Link>
            <Link href="/teile/neu" className="button">
              Teil inserieren
            </Link>
          </div>
        </div>
      </section>
      <LandingRuntime />
    </main>
  );
}
