# Teilebörse – Umsetzungsplan

## Architektur

Next.js 15 App Router, TypeScript strict, Server Actions, Tailwind. Supabase Auth verifiziert Identitäten; die Service-Role bleibt serverseitig. PostgreSQL ist die einzige Quelle für Preise, Rechte, Limits und Status. Alle Anwendungstabellen erhalten RLS ohne Client-Policies. Öffentliche DTOs werden explizit aufgebaut. SMTP, Stripe und Captcha werden ohne gültige Konfiguration nicht simuliert.

## Datenmodell

Die Migration enthält Inserate, Unternehmen, Anfragen, Nachrichten, Gesuche, Treffer, Meldungen, Moderationslog, Bewertungen, Käufe und Einstellungen. Ergänzungen: Profile/Rollen, Token-Hashes, E-Mail-Outbox, In-App-Benachrichtigungen, Webhook-Events und atomare Rate-Limits. Inserate brauchen einen separaten E-Mail-Bestätigungszeitpunkt, damit ein Gast-Inserat vor der Bestätigung unsichtbar bleibt. Alle Zustandswechsel mit Nebenwirkungen werden als Transaktionen/RPCs umgesetzt. Die Outbox ermöglicht wiederholbare Zustellung.

## Routen

- `/`: Scrollcraft-Landingpage, isoliert unter public/landing.
- `/teile`, `/teile/[id]`: öffentliche Whitelist, Filter, Cursor und SEO.
- `/teile/neu`, `/teile/gesuch/neu`: dreistufiger Inserat-Wizard und Gesuche.
- `/teile/meine`, `/teile/meine/[token]`, `/teile/anfrage/[token]`: Konto/Gast-Verwaltung und Verlauf.
- `/teile/gesuch/bestaetigen`, `/teile/twint-freigabe/[t]`: GET zeigt die Bestätigung, POST führt sie aus.
- `/anbieter/[slug]`, `/admin/*`: Anbieter und rollenbasierte Moderation.
- `/api/inbound/reply`, `/api/webhooks/stripe`, `/api/cron/*`: signierte Integrationen.
- `/sitemap-teile.xml`, `/impressum`, `/datenschutz`, `/agb`.

## Phasen und Abnahme

1. Setup, Migration/RLS, Konstanten und Sicherheitsfunktionen. Unit-Tests + Produktionsbuild.
2. Öffentlicher Marktplatz, Filter, Detail, DTO, Sitemap. Payload-/Filter-Tests + Build.
3. Inserat-Wizard, Upload, Captcha, Bestätigung. Bild-/Schema-/Limits-Tests + Build.
4. Anfragen, Verlauf, Outbox/SMTP, Gast-Tokens, Mailantworten. Autorisierungs-/Signatur-Tests + Build.
5. Stripe und TWINT. Atomare Reservierung/Freigabe, Idempotenz-Tests + Build.
6. Gesuche, Moderation, Matching/Ablauf. Mengen-/Deduplizierungs-/Cron-Tests + Build.
7. Meldungen, Admin, Bewertungen. Konkurrenz-/Rollen-Tests + Build.
8. Gewerbliche Profile und CSV. Validierungs-/Import-Tests + Build.
9. Landingpage und Rechtstext-Entwürfe. Mobile-/Reduced-motion-Prüfung + Build. Rechtstexte erst nach Betreiberfreigabe veröffentlichen.
10. Playwright-Gesamtflow, Lighthouse mobil ≥90, Security-Review und Deployment.

## Externe Voraussetzungen und offene Entscheidungen

Supabase-Projekt, SMTP-/Postal-Version und echte Webhook-Signaturkonvention, Stripe-Konto/Connect-Zahlungsmodell und Auszahlungen an Verkäufer, reCAPTCHA-Schlüssel, Hosting, Domain und Betreiberangaben müssen bereitgestellt werden. Ein normaler Stripe Checkout überweist nicht automatisch an Verkäufer: Zahlungs- und Auszahlungsmodell vor Aktivierung klären. Keine erfundenen Rechts-/Firmenangaben veröffentlichen.

## Arbeitsstand

Lokale Umsetzung und Prüfungen: Sicherheitsfunktionen, öffentliche Suche, Wizard, Anfrage-/TWINT-Transaktionen, Gesuche, Moderation, Firmenprofile und Landingpage sind implementiert. Vitest prüft unter anderem tatsächliche PostgreSQL-Migrationen mit PGlite; Playwright prüft Desktop und Mobilgeräte. Produktionsbuild ist lokal geprüft. Der detaillierte Restumfang steht in README.md.

Keine vollständige Produktionsabnahme: Stripe/Connect, einzelne Verwaltungsfunktionen, CSV, Rechtstexte und das Live-Integrationsaudit bleiben offen. Nutzer plant Vercel und Supabase; Dienste und Domain werden erst eingerichtet. Die Gebührenzuordnung für Stripe ist noch zu beantworten. Ein lokaler Datenbanktest ersetzt keine Prüfung des echten Supabase-Projekts. Demo-Daten sind ausdrücklich markiert; Live-Aktionen täuschen keine Erfolge vor.
