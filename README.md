# Teilebörse

Next.js 15.5.27, React 19, TypeScript strict, Tailwind, Supabase und serverseitige Aktionen. Schweizer Deutsch, CHF und Europe/Zurich.

## Lokal starten

```sh
npm ci
npm run dev
```

Vorschau: http://127.0.0.1:3000. Ohne `.env.local` zeigt der Marktplatz sechs ausdrücklich gekennzeichnete Beispielinserate. Live-Aktionen liefern eine verständliche Meldung, wenn ihre Dienste fehlen. Es gibt keine simulierten erfolgreichen Inserate, Anfragen oder Zahlungen.

## Einrichtung für Vercel und Supabase

1. Neues Supabase-Projekt in einer passenden europäischen Region erstellen. Alle SQL-Dateien unter `supabase/migrations/` in Dateinamens-Reihenfolge ausführen. Supabase Auth und Storage werden durch die Migration vorausgesetzt.
2. `.env.example` nach `.env.local` kopieren. URL, Anon-Key und Service-Role eintragen. Die Service-Role darf niemals ein `NEXT_PUBLIC_`-Präfix erhalten. Für `TOKEN_SECRET`, `IP_HASH_SECRET` und `CRON_SECRET` getrennte kryptografisch zufällige Werte mit mindestens 32 Zeichen einsetzen, etwa mit `openssl rand -hex 32`.
3. `APP_ORIGIN` auf die tatsächliche HTTPS-Adresse setzen, `BRAND_DOMAIN` ohne Protokoll. Den Namen über `BRAND_NAME` ändern.
4. Supabase Auth: Site URL und erlaubte Redirect URL `<APP_ORIGIN>/auth/callback` setzen. Eigenen SMTP-Versand auch für Supabase Auth konfigurieren. Registrierung ist derzeit passwortlos über einen E-Mail-Link.
5. reCAPTCHA v3: Site-Key/Secret und `RECAPTCHA_HOSTNAME` genau auf den verwendeten Host setzen. Aktionen: `listing`, `upload`, `inquiry`, `report`, `wanted`, `magic-link`, `login`. Fehler, falscher Host, falsche Aktion und Score < 0.5 werden abgelehnt.
6. SMTP-Daten setzen. IPv4-Auflösung, STARTTLS, Zertifikatsprüfung und begrenzte Timeouts sind implementiert. SPF, DKIM, DMARC und PTR richten sich nach dem Mailserver. Für Tests `EMAIL_RECIPIENT_ALLOWLIST` setzen; in Produktion leer lassen.
7. Postal: JSON/processed-Payload, Zitatabtrennung und signierte Zustellung an `/api/inbound/reply` konfigurieren. `REPLY_DOMAIN` und MX für die Reply-Domain setzen. `POSTAL_JWKS_URL` muss eine vertrauenswürdige HTTPS-Adresse des eigenen Postal-Servers sein. Prüfer erwartet `X-Postal-Signature-256` und `X-Postal-Signature-KID`; kein SHA-1-Fallback. Anhänge werden nicht übernommen.
8. Erstes Admin-Konto normal anmelden. Die Rolle dieses Kontos anschliessend einmalig in Supabase `profiles.role` auf `admin` setzen. Rollen werden niemals vom Browser übernommen.
9. Vercel-Projekt mit diesem Ordner verbinden, sämtliche benötigten Variablen als Runtime-Variablen setzen. `vercel.json` enthält einen stündlichen Wartungsjob. Einen Vercel-Tarif verwenden, der stündliche Cron-Jobs zulässt. Der Job erwartet `Authorization: Bearer <CRON_SECRET>`.
10. Vor Deployment `npm test`, `npm run test:e2e` und `npm run build` ausführen. Vercel/Supabase sowie echte Mail- und Zahlungsintegration sind hier noch nicht eingerichtet oder abgenommen.

## Tests

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Falls Chrome bereits installiert ist und der Browser-Download nicht erreichbar ist:

```sh
PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
```

Vitest verwendet für Migrationen und Transaktionen lokal PGlite/PostgreSQL. Nur `pgcrypto` und die minimalen Supabase-Auth-/Storage-Strukturen werden für diese Tests ersetzt. Das ist keine Abnahme eines echten Supabase-Projekts. Die E2E-Vorschau-Tests laufen ohne Zugangsdaten und prüfen Navigation, Suche, private Feldnamen im HTML, Wizard-Zustand, Mengenlimits und fehlende Dienstkonfiguration. Der vollständige Live-Ablauf mit zwei echten Mailkonten, Mailzustellung und Webhooks bleibt nach Einrichtung erforderlich.

## Umgesetzt

- Schriftlicher Daten-/Routen-/Phasenplan: `docs/PLAN.md`.
- SQL-Migrationen mit RLS deny-all, gesperrten Client-Grants und ausschliesslich serverseitigen Service-RPCs.
- Marktplatz, Volltext-/Fahrzeug-/Reifen-/Preis-/Ort-Filter und Cursor mit 24 Inseraten; öffentliche Whitelist-DTOs; Detailgalerie, Product/Offer-JSON-LD und Sitemap.
- Drei-Schritt-Wizard mit Kategorie-/Zustand-/Angebots-/Saison-Kacheln, bis zu fünf Fotos und mehreren Fahrzeugen. Backend prüft Gewerbezugehörigkeit. Stripe-Angebote bleiben gesperrt.
- PLZ-Zuordnung aus dem offiziellen swisstopo-Ortschaftenverzeichnis für Schweiz und Liechtenstein. Mehrkantonige PLZ erfordern eine Auswahl; administrative PLZ ohne Ortschaftsdatensatz erlauben die ausdrückliche Kantonswahl. Bekannte Zuordnungen werden auch serverseitig geprüft.
- Bild-Neukodierung, Metadatenentfernung, Pixel-/Format-/Grössenlimits; Klartext-Zod-Preprocessing, signierte Tokens, Honeypot, Captcha fail closed und atomare Postgres-Limits.
- Gast-Inserat per explizitem Bestätigungsklick; Konten per Supabase; Verknüpfung von Gast-Daten nur bei bestätigter E-Mail; Gast- und Kontoübersicht.
- Kontobenachrichtigungen für neue Anfragen, Nachrichten und Statuswechsel mit Lesemarkierung.
- Anfragen mit Mail-Outbox an beide Parteien, persönlicher Verlauf, Statuswechsel, direkte Mailantworten und Benachrichtigungsdrosselung.
- Explizite und idempotente TWINT-Freigabe pro Anfrage. Die Nummer erscheint nur nach Freigabe im privaten Verlauf und in der Käufer-Mail.
- Gesuche mit max. fünf Artikeln, max. zehn offenen Artikeln, Klickbestätigung, Vorprüfung, Moderation, deduplizierten Treffer-Mails, Ablauf und Verlängerungslinks.
- Meldungen mit gesalzenem IP-Hash; automatische Ausblendung ab drei offenen Meldungen; Moderationsoberfläche und Admin-Einstellungen.
- Firmenprofile mit UID, Adresse, öffentlichen Angeboten und Gewerbe-Badge.
- Bewertungs-RPC: nur nach abgeschlossener Übergabe zwischen den zwei Konten; unveränderbare Bewertung. Bewertungsformular im persönlichen Bereich für abgeschlossene Übergaben, öffentlicher Schnitt und Verifiziert-Hinweis ab 20 Bewertungen.
- Landingpage mit isolierten Scrollcraft-Styles, Vorher-/Nachher-Hero, Kantonskacheln und Reduced-motion-Regeln. Die Vorlage bleibt als Referenz unverändert; sie wird nicht veröffentlicht.

## Noch offen – kein produktionsfertiger Gesamtstand

- Stripe Checkout, Connect-Auszahlungen, Webhook und Checkout-Reservierungs-Cron: Gebührenzahler und Auszahlungsmodell noch zu bestätigen. Stripe ist ausdrücklich deaktiviert; Stripe-Schlüssel allein aktivieren nichts.
- Gesuche: zusätzliche Reifen-/Baujahr-Felder, Konto-Flow ohne erneute Gastbestätigung sowie vollständiges Zurückziehen/Erfüllen in der Übersicht.
- Editieren eigener Inserate, Verwaltung der TWINT-Freigabe direkt aus der Kontoübersicht, CSV-Sammelimport, optionaler Web-Push.

- Rechtstextentwürfe und Betreiberfreigabe; jetzige Rechtsseiten sind klar gekennzeichnete Platzhalter, keine freigegebenen AGB/Datenschutzerklärung.
- Echtes Supabase-/Postal-/Vercel-Integrationsaudit, gesamter Live-E2E-Ablauf und Deployment.

## Betriebsdetails

SMTP-Zustellung läuft über eine leased Outbox mit Wiederholungen. System-E-Mails mit Zugangslinks sind in der Outbox AES-256-GCM-verschlüsselt; die Token-Tabelle enthält ausschliesslich Hashes. `TOKEN_SECRET` dient als Master-Key für getrennte Token-/Outbox-Zwecke; Rotation vorab planen und die alte Outbox abarbeiten. Deduplizierung verhindert mehrfaches Einreihen derselben Treffermail; SMTP selbst ist bei Abstürzen nach Zustellung nur at-least-once.

Moderationsaktion «Entfernen» entfernt den Inhalt aus der Öffentlichkeit und behält einen internen Datensatz für Anfragen/Audit; sie ist aktuell eine logische Entfernung. Die Navigation im persönlichen Bereich zeigt alle Status, öffentliche Detailseiten nur verfügbare/reservierte Inserate. Produktionsbetrieb benötigt eine bewusste Lösch-/Aufbewahrungsregel.

Die öffentlichen Buckets benötigen ein frisches Supabase-Projekt ohne allgemein erlaubende `storage.objects`-Policies. Keine Client-Insert-/Update-Policy für `parts-photos` anlegen. In einem schon genutzten Supabase-Projekt bestehende Storage-Policies vor Übernahme prüfen.

## Bildassets

`public/landing/garage.webp` und `public/landing/keller.webp` wurden mit dem eingebauten Imagegen erzeugt, visuell geprüft und mit sharp als WebP unter 300 KB gespeichert (1536 px). Prompts: vier Winterräder in einer Schweizer Garage mit montierten Rädern am Kombi und Schweizer Landschaft; vier leicht staubige Winterräder an einer dunklen Kellerwand. Jeweils fotorealistisch, links Platz für Text, ohne Logos oder Schrift. Der Demo-Reifenartikel verwendet ausdrücklich ein Beispielbild.

Postal-Referenzen: [HTTP-Payload](https://docs.postalserver.io/developer/http-payloads/) und [Signaturheader im Originalcode](https://github.com/postalserver/postal/blob/main/lib/postal/http.rb).

PLZ-Daten: [Offizielles Ortschaftenverzeichnis von swisstopo](https://www.swisstopo.admin.ch/en/official-directory-of-towns-and-cities), CSV-Bezug am 3. Oktober 2026; lokal gespeichert in `src/data/postcodes.json`. Vor späterem Betrieb regelmässig aktualisieren.

Lokaler Prüfstand: 38 Vitest-Tests, 16 Playwright-Tests (Desktop/Mobil) und Produktionsbuild bestanden. Lighthouse mobil gegen die lokale Produktionsvorschau: Performance 99/100; dies ersetzt keine Messung auf Vercel mit echten Daten. Der Demo-Modus ist absichtlich von der Indexierung ausgeschlossen.

## Scroll-Craft-Landingpage

Der vom Nutzer gewünschte [Scroll-Craft-Skill](https://github.com/nateherkai/scroll-craft) liegt vollständig unter `.agents/skills/scroll-craft/` und ist ab dem nächsten Turn für weitere Arbeiten auffindbar. Die unveränderte Engine wird aus `public/landing/scrollcraft.js` geladen; CSS-Selektoren sind auf die Landingpage begrenzt. Der projektspezifische Rundgang, Layervertrag, Geräte-Score und die Gestaltungsannahmen stehen in `scrollcraft/builds/teileboerse/BRIEF.md`.

Neue Assets: `public/landing/keller-plate-v2.webp` (193966 Bytes) und `public/landing/wheel-cutout-v2.webp` (172924 Bytes, echtes Alpha). Mit dem eingebauten Imagegen erstellt, visuell geprüft und als WebP optimiert. Prompts: vorhandenes Kellerfoto von allen vier Rädern bereinigen, Kamera und Beleuchtung erhalten; einzelnes vollständiges Winterrad mit dunkler Alufelge in Dreiviertelansicht, natürliche Garagenbeleuchtung, transparent mit Kontaktschatten, ohne Logos/Text. Originale bleiben unverändert.

Der Hero ist die längste gehaltene Szene; Angebotsarten bewegen sich auf einem horizontalen Rail. Die native Reifensuche übermittelt ausgewählte Grössen an `/teile`. Reduced motion zeigt eine vollständige statische Komposition und legt das Rail als zugängliches Grid aus. Skill-Kontaktbögen und Prüfberichte liegen unter `scrollcraft/builds/teileboerse/lab/`. Die ersten Läufe dokumentieren den behobenen CSS-Konflikt; nur die als final bezeichneten Läufe gelten für den gelieferten Stand. Ein echtes iPhone wurde nicht geprüft.

### Adminbereich

Unter `/admin` stehen Übersicht, die neuesten 50 Inserate und Anbieter, Meldungen, Gesuchfreigabe, Protokoll und Plattform-Einstellungen bereit. Ohne Supabase erscheint eine ausdrücklich gekennzeichnete Vorschau ohne Verwaltungsaktionen. Admin-Anmeldelinks führen zurück zum Dashboard. Das erste Konto nach Anmeldung in Supabase `profiles.role` auf `admin` setzen; diese Zuweisung erfolgt ausschliesslich durch den Betreiber. Migration `202610030014_admin_dashboard.sql` mit ausführen. Moderatoren können Inserate aus-/einblenden und Gesuche/Meldungen bearbeiten; Anbieter-Prüfsiegel und Einstellungen benötigen die Adminrolle. Änderungen an Inseraten und Prüfsiegeln verlangen eine Begründung und schreiben ein Protokoll. Die Anbieterprüfung bestätigt deine manuelle Prüfung, sie ist keine automatische UID-Verifikation.

### Monetarisierung: Pilotphase

`/preise` zeigt das Modell (Privat gratis; geplante Händlerpakete CHF 39/79/149 monatlich; Boost CHF 5.90 für 7 Tage; Sponsoring ab CHF 150 monatlich). `/partner` nimmt unverbindliche Anfragen angemeldeter, bestätigter Konten entgegen. reCAPTCHA, Rate-Limit und Inseratsbesitzprüfung schützen den Anfrageweg. Kein Checkout, keine Rechnung, kein aktiviertes Abo und kein aktivierter Boost werden dadurch ausgelöst. `/admin/umsatz` ist ausschliesslich für Administratoren; Änderungen an Anfragestatus und internen Notizen werden atomar protokolliert. Für die neuen Tabellen Migration `202610030015_commercial_requests.sql` ausführen.

Die Zahlungsvorbereitung umfasst aktuell Angebotsschlüssel, serverseitige Preiszuordnung, Anfragestatus und das getrennte Audit-Protokoll. Stripe-Checkout/Webhooks, Zahlungsstatus, wiederkehrende Abrechnung, Paketkontingente, Boost-Ausspielung und enthaltene Boost-Guthaben sind noch nicht implementiert. CSV-Import, Mehrbenutzerzugänge, Nutzungsstatistiken, regionale Werbeausspielung, Montagevermittlung und Affiliate-Abrechnung bleiben spätere Ausbaustufen. Die öffentliche Preisseite bezeichnet diese Leistungen ausdrücklich als geplant; Anfragen lösen keine kostenpflichtigen Leistungen aus. Preise sind vor kommerziellem Launch einschliesslich Steuerdarstellung, Vertragsbedingungen und Kündigungsregeln festzulegen.

### Admin-Arbeitsbereich und CRM

Die gemeinsame Adminnavigation verbindet Dashboard, `/admin/crm`, `/admin/inserate`, `/admin/statistik`, Partneranfragen, Moderation und Einstellungen. CRM: Kontakte anlegen/bearbeiten, Phasen, Wiedervorlage, Gesprächsnotizen, Änderungsverlauf und idempotente Übernahme von Partneranfragen. CRM und Statistik benötigen Administratorrechte; die Inserateübersicht ist auch für Moderatoren zugänglich. CRM-Daten bleiben ausschliesslich serverseitig erreichbar, keine Client-RLS-Freigabe. Migration `202610030016_crm.sql` ausführen.

Inserateübersicht: Titelsuche, Status/Sichtbarkeit, 25 Datensätze pro Seite und Moderationsaktionen. CRM zeigt maximal 200 Kontakte; seine Phasenzahlen beziehen sich auf diese gefilterte Auswahl. Statistik zählt Gesamtbestände, neue Inserate, Kontakte und fällige Wiedervorlagen; Tagesverlauf über 7/30/90 Tage wird in SQL aggregiert, Zeitzone Europe/Zurich. Keine erfundenen Besucher- oder Umsatzdaten: Besuchermessung und Zahlungsumsatz fehlen weiterhin. Ohne Supabase zeigen alle neuen Ansichten ausschliesslich gekennzeichnete Beispieldaten, CRM-Speichern ist deaktiviert. Rückmeldungen werden nicht automatisch versendet.
