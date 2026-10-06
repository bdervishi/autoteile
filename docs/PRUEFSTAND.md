# Lokaler Prüfstand – 3. Oktober 2026

## Reproduzierbare Prüfungen

- `npm test`: 38 Tests. Klartext, Schema, Token-Manipulation, Bildformat/Metadaten, Captcha, Postal-Signaturen, Outbox-Verschlüsselung und offizielle PLZ-Zuordnung.
- Die neun Datenbanktests führen sämtliche Migrationen in PGlite/PostgreSQL aus. Sie prüfen entzogene Client-Rechte, atomare Rate-Limits, einmalige Bestätigung, TWINT vor/nach Freigabe, Reservierung/Abschluss, automatische Ausblendung, Absenderprüfung/Replay und Gesuchlimits sowie bestätigte Kontoverknüpfung.
- `npm run build`: Produktionsbuild inklusive TypeScript-Prüfung bestanden.
- `npm run test:e2e`: 16 Vorschautests auf Desktop und Mobil. Navigation, Suche, keine privaten Feldnamen im öffentlichen HTML, erhaltene Wizard-Werte, fünf Gesuchartikel und ehrliche Fehlermeldungen ohne Dienste.
- `docs/lighthouse-mobile.json`: Lighthouse-Bericht gegen den lokalen Produktionsserver. Demo-Modus bleibt absichtlich `noindex`.

## Sicherheitsentscheidungen

Service-Role nur im Server; RLS ohne Browser-Policies; öffentliche DTOs mit Feld-Whitelist; signierte Zugangslinks mit Hash-Registry; Systemmails mit Zugangslinks verschlüsselt in der Outbox. Zustandswechsel und Nebenwirkungen laufen in PostgreSQL-Transaktionen. TWINT benötigt explizite Freigabe. Postal prüft RSA-SHA256, HMAC-Routing und beide Absenderfelder; eingehende Bodies sind beim Lesen auf 1 MB begrenzt. Unkonfigurierte Dienste scheitern kontrolliert.

## Grenzen dieser Prüfung

Keine echten Zugangsdaten, SMTP-Zustellung, Supabase-Storage-Policies im Zielprojekt, Stripe-Integration oder Vercel-Deployment geprüft. Lokale Performance ist kein Nachweis für produktive Infrastruktur. Die E2E-Tests ersetzen nicht den Live-Ablauf mit zwei unabhängigen Mailkonten. Der funktionale Restumfang steht in README.md; es gibt keine vollständige Produktionsfreigabe.

Admin-Erweiterung: Produktionsbuild bestanden; 39 Unit-/Datenbanktests und 18 Desktop-/Mobiltests bestanden. Neue Transaktionsprüfung umfasst fehlende Rollen, Admin-only-Anbieterprüfung, verpflichtende Begründung, Audit-Eintrag und verweigerte RPC-Aufrufe für anon/authenticated. Dashboard-Vorschau visuell im Browser geprüft. Live-Supabase-Anmeldung und produktive Verwaltungsaktionen bleiben bis zur Einrichtung ungeprüft.

Monetarisierungs-Pilot: 42 Unit-/Datenbanktests bestanden, Produktionsbuild bestanden. Preisangebote sind serverseitig festgelegt; Anfragedaten können keine Preise oder Freigabestatus einschleusen. Datenbanktest prüft Admin-only-Bearbeitung, Protokollierung und verweigerte Client-Zugriffe auf kommerzielle Anfragen. Keine produktiven Zahlungen oder Stripe-Abrechnung getestet oder implementiert.

Admin-Arbeitsbereich/CRM: Build bestanden, 45 Unit-/Datenbanktests und 22 Desktop-/Mobiltests bestanden. Datenbanktests prüfen Admin-only-CRM, atomare Änderungen mit Aktivitätsprotokoll, Notizvalidierung, idempotenten Partnerimport und verweigerte Clientzugriffe. Desktop-Ansichten für CRM und Statistik im Browser visuell geprüft; Mobilnavigation, Filter und Überlauf automatisiert geprüft. Produktive Supabase-Kontakte/Anmeldung weiterhin nicht eingerichtet.
