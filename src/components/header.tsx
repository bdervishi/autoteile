import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { BRAND_NAME } from "@/lib/constants";
export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <img
          className="brand-logo"
          src="/brand/partvivo-logo.svg"
          width="180"
          height="39"
          alt={BRAND_NAME}
        />
        <small>CH</small>
      </Link>
      <nav aria-label="Hauptnavigation">
        <Link href="/teile" className="nav-market">
          Marktplatz
        </Link>
        <Link
          href="/teile/meine"
          className="account-link"
          aria-label="Mein Bereich"
        >
          <UserRound size={18} />
          <span>Mein Bereich</span>
        </Link>
        <Link href="/teile/neu" className="button primary small">
          <Plus size={18} />
          Inserieren
        </Link>
      </nav>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link href="/" className="brand">
          <img
            className="brand-logo"
            src="/brand/partvivo-logo.svg"
            width="180"
            height="39"
            alt={BRAND_NAME}
          />
        </Link>
        <p>Gute Teile verdienen eine zweite Runde.</p>
      </div>
      <div>
        <Link href="/teile">Marktplatz</Link>
        <Link href="/teile/gesuch/neu">Gesuch aufgeben</Link>
        <Link href="/preise">Preise & Händlerpakete</Link>
        <Link href="/partner">Pilotpartner werden</Link>
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/agb">AGB</Link>
      </div>
      <small>Schweiz · CHF · Deutsch</small>
    </footer>
  );
}
