# Prompt: Marktplatz für Autoteile und Autozubehör (Schweiz)

> Diesen ganzen Text als Auftrag an eine KI-Entwicklungsumgebung (z.B. Claude Code) in einem **neuen, leeren Projekt** geben. Den Ordner `landing-vorlage/` aus diesem Paket ins Projekt legen, bevor du startest.

---

## 1. Auftrag

Baue eine eigenständige Web-Plattform: einen **Marktplatz für Autoteile, Reifen, Felgen und Autozubehör in der Schweiz**. Private und Garagen verkaufen, tauschen oder verschenken Teile. Suchende finden sie über Filter und können ein **Gesuch** aufgeben („Ich suche …“) und werden benachrichtigt, sobald ein passendes Inserat erscheint.

Arbeitstitel: **„Teilebörse“** (Name/Domain sind Platzhalter, als Konstante `BRAND_NAME` / `BRAND_DOMAIN` zentral halten).

Die Plattform ist ein **Nachbau eines bestehenden, produktiv laufenden Moduls** (Sport-Tauschbörse einer Vereinssoftware). Übernimm dessen Abläufe und Sicherheitsregeln (unten vollständig beschrieben), aber **ohne Vereins-Konzept**: Statt „Verein“ gibt es optional **gewerbliche Anbieter (Garagen, Händler, Pneuhäuser)**.

Arbeitsweise:
- Zuerst einen schriftlichen Plan (Datenmodell, Routen, Phasen), dann phasenweise bauen. Jede Phase mit Tests abschliessen.
- Alle Texte für Nutzer auf **Deutsch (Schweiz)**: „ss“ statt „ß“, echte Umlaute (ä/ö/ü, nie ae/oe/ue), CHF, Datum `TT.MM.JJJJ`, Zeitzone `Europe/Zurich`.
- Bei unklaren Punkten nachfragen statt raten.

---

## 2. Technik

- **Next.js 15** (App Router, Server Components, Server Actions), React, TypeScript (strict).
- **Supabase**: PostgreSQL, Auth, Storage. Alle Marktplatz-Tabellen mit **RLS deny-all**; Zugriff ausschliesslich serverseitig mit Service-Role. Kein direkter Client-Zugriff auf Tabellen oder Storage-Uploads.
- **sharp** für Bildverarbeitung.
- **E-Mail** über eigenen SMTP-Server (z.B. Postal) mit nodemailer. Eingehende Mails (Antworten) über HTTP-Webhook des Mailservers.
- **Stripe** (Checkout) für Online-Zahlung mit Plattform-Gebühr; **TWINT direkt** als gebührenfreie Alternative.
- **reCAPTCHA v3** für alle Formulare ohne Login.
- **Upstash Redis** (oder Postgres-Tabelle) für Rate-Limits.
- **Vitest** für Unit-/Integrationstests, **Playwright** für E2E.
- Tailwind CSS. Für die Landingpage die mitgelieferte Scrollcraft-Engine (siehe Abschnitt 12).

Wichtige Regeln für Next.js:
- Dateien mit `'use server'` dürfen **nur `async function`** exportieren. Zod-Schemas, Konstanten und Typen in eigene `*.schemas.ts`/`*.types.ts` auslagern (sonst Build-Fehler „A 'use server' file can only export async functions“).
- In Server Actions **keine Fehler mit Nutzertexten werfen** — Next.js blendet Fehlertexte in Produktion aus („An error occurred in the Server Components render“). Stattdessen Ergebnis-Objekte zurückgeben: `{ ok: true, … } | { ok: false, error: 'Verständlicher Text' }`.
- Vor jedem Deploy einmal `next build` laufen lassen, nicht nur `tsc`.

---

## 3. Rollen und Zugänge

| Rolle | Kann |
|---|---|
| **Gast** (ohne Konto) | Stöbern, filtern, Inserate ansehen, **Anfragen senden** (Name + E-Mail + reCAPTCHA), **inserieren** (Name + E-Mail, Bestätigung per Mail), **Gesuche aufgeben**. Verwaltung eigener Inserate/Anfragen über **Magic-Link per E-Mail** (kein Passwort). |
| **Privatkonto** | Wie Gast, plus persönlicher Bereich „Meine Inserate / Anfragen / Gesuche“, Bewertungen abgeben und erhalten. Beim Registrieren werden frühere Gast-Inserate mit derselben (bestätigten!) E-Mail verknüpft. |
| **Gewerblicher Anbieter** (Garage/Händler) | Wie Privatkonto, plus Firmenprofil (Name, Adresse, UID-Nr., Logo, Website), Badge „Gewerblich“ auf Inseraten, höhere Inserate-Limits, optional Sammel-Import (CSV). Pflichtangaben für gewerbliche Verkäufer im Impressum der Profilseite. |
| **Moderator / Admin** | Meldungen bearbeiten, Inserate ausblenden/löschen, Gesuche freigeben/ablehnen (mit Grund), Einstellungen der Plattform, Moderations-Log. |

Konto-Verknüpfung nur nach **bestätigter** E-Mail-Adresse (sonst kann jemand fremde Gast-Inserate übernehmen).

---

## 4. Datenmodell (Postgres, alle Tabellen RLS deny-all)

Kategorien als Konstante (erweiterbar):
`reifen`, `felgen`, `kompletträder`, `motor_antrieb`, `karosserie`, `beleuchtung`, `innenraum`, `elektronik_multimedia`, `fahrwerk_bremsen`, `auspuff`, `dachträger_anhängerkupplung`, `pflege_werkzeug`, `kindersitze`, `zubehör`, `sonstiges`.

Zustand: `neu`, `neuwertig`, `gebraucht_gut`, `gebraucht`, `defekt_bastler`.

Angebotsart: `tausch`, `gratis`, `verkauf` (online), `verkauf_bar` (bei Abholung).

### `parts_items` (Inserate)
- `id uuid pk`, `owner_type` (`private` | `business` | `guest`), `owner_user_id uuid null`, `business_id uuid null`, `owner_name text` (öffentlich nur „Vorname N.“ bzw. Firmenname), `guest_email text null` (privat!)
- `title text` (2–120), `description text` (≤ 2000), `category`, `condition`
- **Fahrzeug-Kompatibilität**: `fits jsonb` = Liste von `{ make, model, year_from, year_to, engine? }`; Freitext `fits_note`.
- **Teile-Daten**: `oem_number text` (Original-Teilenummer), `manufacturer text` (Hersteller des Teils)
- **Reifen/Felgen** (nur wenn Kategorie passt): `tire_width`, `tire_ratio`, `rim_diameter` (z.B. 205/55 R16), `tire_season` (`sommer`/`winter`/`ganzjahr`), `tire_dot` (Herstellwoche/-jahr), `tread_mm` (Profiltiefe), `rim_bolt_pattern` (z.B. 5x112), `rim_offset_et`, `rim_width`, `quantity` (1–4)
- `photos text[]` (max. **5**, nur URLs aus dem eigenen Storage-Bucket)
- `offer_type`, `price_chf numeric(10,2)`, `swap_for text`, `negotiable bool`
- `shipping_possible bool`, `pickup_zip text` (4 Ziffern), `pickup_canton text`
- `payment_mode` (`stripe` | `twint-direct` | null), `twint_phone text null` (**privat**)
- `status` (`available` | `reserved` | `completed` | `withdrawn`), `moderation_hidden_at timestamptz`, `wanted_id uuid null` (Inserat als Antwort auf ein Gesuch)
- `search_tsv tsvector GENERATED` (deutsch) über Titel, Beschreibung, Marke, Modell, Teilenummer
- `created_at`, `updated_at`
- Indizes: Status + created_at, Kategorie, Kanton, `fits` (GIN), `search_tsv` (GIN), `oem_number`

### `parts_trades` (Anfragen)
- `id`, `item_id fk`, `requester_type` (`private` | `business` | `guest`), `requester_user_id null`, `requester_email null` (privat), `requester_name` (öffentlich gekürzt)
- `message` (2–2000), `offer_back` (Gegenangebot bei Tausch), `status` (`requested` | `accepted` | `declined` | `completed` | `cancelled`), `response_message`
- `access_token_hash text unique` (Gast-Zugang zum Verlauf, nur Hash speichern)
- `owner_notified_at`, `responded_at`, `completed_at`, `created_at`, `updated_at`
- **TWINT-Freigabe**: `twint_requested bool default false`, `twint_released_at timestamptz`
- Unique: eine offene Anfrage pro Person und Inserat

### `parts_messages`
`id`, `trade_id fk`, `sender_role` (`owner` | `requester`), `body` (1–2000), `created_at`

### `parts_wanted` (Gesuche „Ich suche …“)
`id`, `group_id` + `group_title` (ein Gesuch mit bis zu 5 Artikeln = 5 Zeilen mit gleicher group_id), `owner_type`, `owner_user_id`, `owner_name`, `guest_email`, `category`, Kompatibilität (`make`, `model`, `year`), `oem_number`, Reifengrösse, `min_condition`, `offer` (`tausch` | `gratis` | `kauf`), `max_price_chf`, `swap_offer` (≤ 120), `note` (≤ 200), `pickup_zip`, `status` (`pending_email` | `pending_review` | `active` | `rejected` | `expired` | `fulfilled` | `withdrawn`), `auto_check jsonb`, `reject_reason`, `reviewed_by`, `reviewed_at`, `expires_at` (30 Tage), `expiry_reminded_at`.

### `parts_wanted_matches`
`wanted_id`, `item_id`, `notified_at` (PK aus beiden → jede Treffer-Mail nur einmal).

### `parts_reports` (Meldungen)
`item_id`, `reason` (`betrug`, `gestohlen`, `verboten`, `unangemessen`, `spam`, `falsche_angaben`, `sonstiges`), `note` (≤ 1000), `reporter_ip_hash` (gesalzener Hash, nie Klartext-IP), `reporter_user_id`, `status` (`open` | `dismissed` | `actioned`), `handled_by`, `handled_at`. Unique: eine offene Meldung pro IP und Inserat.

### `parts_moderation_log`
`item_id` (ohne FK, bleibt nach Löschung), `item_title`, `action` (`auto_hide` | `withdraw` | `delete` | `unhide` | `dismiss`), `reason`, `actor_user_id`, `report_count`, `created_at`.

### `parts_ratings`
`rater_id`, `rated_user_id`, `item_id`, `stars` (1–5), `comment`, unique (`rater_id`, `item_id`). Nicht änderbar. Ab 20 Bewertungen gilt man als „verifiziert“.

### `parts_purchases` (Stripe)
`item_id`, `buyer_user_id`, `seller_user_id`, `amount_chf`, `platform_fee_chf`, `stripe_session_id`, `status` (`pending` | `paid` | `expired` | `refunded`), Zeitstempel. Reservierung des Inserats während des Checkouts; Cron gibt abgelaufene Reservierungen wieder frei.

### `businesses`
`id`, `owner_user_id`, `name`, `uid_number` (CHE-xxx.xxx.xxx), `address`, `zip`, `city`, `canton`, `phone`, `website`, `logo_url`, `verified_at`.

### `platform_settings` (eine Zeile, JSON)
`guestListingsEnabled`, `ratingEnabled`, `stripeSaleEnabled`, `twintDirectEnabled`, `maxPhotosPerListing` (≤ 5, Server erzwingt zusätzlich 5), `platformFeePercent` (Standard 10), `guestListingsPerIpPerDay` (3), `wantedEnabled`.

---

## 5. Abläufe

### 5.1 Stöbern (ohne Login)
- `/teile` Liste mit Filtern: Kategorie, Suchbegriff (Volltext inkl. Teilenummer), **Fahrzeug** (Marke → Modell → Baujahr), Reifengrösse (Breite/Querschnitt/Zoll/Saison), Lochkreis, Zustand, Preis von–bis, Angebotsart, PLZ/Kanton, „Versand möglich“, „nur Gewerbliche“ / „nur Private“.
- Cursor-Pagination (nicht Offset), 24 pro Seite.
- Detailseite `/teile/[id]`: Galerie (bis 5 Fotos), alle Angaben, Kompatibilitätsliste, Anbieter (gekürzter Name oder Firmenname, Bewertungsschnitt), Melde-Button, Anfrage-Formular.
- **SEO**: Detailseiten mit `schema.org/Product` + `Offer`, Sitemap `/sitemap-teile.xml`, saubere Titel („Winterreifen 205/55 R16 · VW Golf 7 · CHF 180“).

### 5.2 Inserieren (Wizard, 3 Schritte)
1. **Was**: Kategorie als **Icon-Kacheln (keine Dropdowns)**, Titel, Zustand-Kacheln, je nach Kategorie die passenden Zusatzfelder (Reifen/Felgen-Daten, Teilenummer, Fahrzeug-Kompatibilität mit „+ weiteres Fahrzeug“).
2. **Angebot**: Angebotsart-Kacheln, Preis, „Verhandelbar“, Tauschwunsch, Zahlungsart bei Online-Verkauf: „Karte/TWINT über Plattform (X % Gebühr)“ oder „TWINT direkt an mich (ohne Gebühr)“ + Mobilnummer. Hinweis direkt darunter: *„Deine Nummer bleibt verborgen. Möchte jemand per TWINT zahlen, erhältst du eine E-Mail und gibst die Nummer mit einem Klick nur für diese Person frei.“*
3. **Fotos & Ort**: bis 5 Fotos, PLZ (Kanton automatisch aus PLZ), Versand möglich, Veröffentlichen.
- Gäste: zusätzlich Name + E-Mail; Inserat erst nach Klick auf Bestätigungslink sichtbar; Limit 3 Gast-Inserate pro IP und Tag.
- Hat das Inserat ein offenes Gesuch als Ursprung („Ich habe das“), `wanted_id` setzen.
- Nach Veröffentlichung: Abgleich mit aktiven Gesuchen → Treffer-Mails (siehe 5.6).

### 5.3 Anfrage stellen
- Formular „Interesse? Schreib eine Nachricht.“: Nachricht, bei Tausch Gegenangebot, Gäste zusätzlich Name + E-Mail.
- Schutz für Gäste: reCAPTCHA (fail-closed, Score ≥ 0.5), Honeypot, Rate-Limits (5/Stunde pro IP, 5/Stunde pro E-Mail, 20/Tag pro Inserat).
- Mails:
  - an den Anbieter „Neue Anfrage zu …“ (Nachricht zitiert, Button zur Anfrage),
  - an den Anfragenden „Deine Anfrage ist unterwegs“ (**auch für eingeloggte**, nicht nur Gäste), Gäste mit persönlichem Link zum Verlauf (`/teile/anfrage/[token]`).
- E-Mail-Adressen sieht die Gegenseite **nie**.

### 5.4 Verlauf, Zusage, Abschluss
- Beide Seiten schreiben im Verlauf; jede neue Nachricht → Mail an die Gegenseite, höchstens alle 15 Minuten pro Anfrage und Empfänger.
- Anbieter: **Zusagen** (Inserat → `reserved`, andere offene Anfragen bleiben bis Abschluss), **Absagen**, **Übergabe erledigt** (→ `completed`, übrige offene Anfragen automatisch absagen), **Reservierung aufheben**.
- Anfragender: **Zurückziehen**.
- Nach Abschluss: gegenseitige Bewertung (nur mit Konto).

### 5.5 Antwort direkt per E-Mail (wichtig)
- Jede Mail zu einer Anfrage bekommt ein eigenes **Reply-To**: `antwort+<tradeIdHex><o|r><hmac80bit>@reply.<domain>` (HMAC-SHA256 mit Server-Secret über Anfrage-ID + Rolle).
- Mailserver nimmt Mails an `reply.<domain>` an (eigener MX-Eintrag + Domain-Verifikation) und schickt sie als JSON an `/api/inbound/reply`. Option „Zitate abtrennen“ aktivieren.
- Der Endpunkt übernimmt die Antwort nur, wenn: **Signatur des Mailservers gültig** (Postal: RSA-Signatur gegen JWKS), **HMAC der Adresse gültig**, **Absender = hinterlegte E-Mail dieser Partei**. Ignorieren: Bounces, Spam, `Auto-Submitted` ≠ `no` (Abwesenheitsnotizen → keine Schleifen).
- Text bereinigen: Zitate (`>`), „Am … schrieb …:“, Signaturen (`-- `) entfernen, dann Klartext-Filter (5.10), max. 2000 Zeichen.
- Abgeschlossene Anfrage → einmal pro Tag Info-Mail „Diese Anfrage ist abgeschlossen“.
- Mail-Fusszeile: *„Du kannst direkt auf diese Mail antworten: Deine Antwort erscheint im Anfrage-Verlauf, deine E-Mail-Adresse bleibt verborgen.“*

### 5.6 Gesuche „Ich suche …“
- `/teile/gesuch/neu`: bis zu **5 Artikel pro Gesuch** (z.B. „4 Winterreifen + Felgen + Radmuttern“), je Artikel Kategorie-Kachel, Fahrzeug, Teilenummer/Reifengrösse, Mindestzustand, Angebotsart, Höchstpreis; gemeinsamer Titel, Notiz, PLZ.
- Max. 10 offene Gesuch-Artikel pro Person. Gäste bestätigen per Mail-Link (**Bestätigung per Klick auf der Seite, nicht beim Aufruf** — Mail-Scanner öffnen Links vorab).
- Automatische Vorprüfung (`auto_check`: verbotene Begriffe, Kontaktdaten im Text, Spam-Muster) → dann Freigabe durch Moderator (Ablehnung nur mit Grund, Mail an Ersteller). Admin bekommt In-App-/Push-Benachrichtigung bei neuem Gesuch.
- Aktive Gesuche auf `/teile?ansicht=gesuche` als Karten mit allen Artikeln und je einem Button „Ich habe das“ → Inserat-Wizard vorausgefüllt.
- **Treffer-Mail**: Bei jedem neuen oder wieder eingeblendeten Inserat passende aktive Gesuche suchen (Kategorie + Fahrzeug/Teilenummer/Reifengrösse + Zustand + Preis + Angebotsart) → Mail „Passendes Inserat gefunden“, über `parts_wanted_matches` nur einmal pro Paar.
- Ablauf nach 30 Tagen; 3 Tage vorher Erinnerungsmail mit „Verlängern“-Link (Cron stündlich).

### 5.7 Bezahlen
- **Online (Stripe Checkout)**: Betrag + Plattform-Gebühr aus der **Datenbank** (nie aus dem Client). Inserat während des Checkouts reservieren; Webhook setzt `paid`; Cron gibt nach 30 Minuten unbezahlte Reservierungen frei. Webhook idempotent (Event-ID speichern).
- **TWINT direkt (ohne Gebühr)** — die Nummer ist **nie öffentlich** und wird **nie automatisch** herausgegeben:
  1. Detailseite zeigt „TWINT-Direktzahlung · CHF X an [Name]“ und Button „Per TWINT kaufen“ → springt zum Anfrage-Formular, Häkchen „Ich möchte per TWINT bezahlen“ ist gesetzt (Button heisst dann „Kaufanfrage senden“). Gäste können das auch.
  2. Anbieter erhält Mail „[Name] möchte per TWINT zahlen“ mit Button **„TWINT-Nummer freigeben“** → signierter Link `/teile/twint-freigabe/<tradeId>.<ablauf>.<hmac>` (30 Tage gültig, ohne Login). Freigabe **erst per Klick auf der Seite**. Alternativ Button in „Meine Inserate“.
  3. Nach Freigabe (genau einmal, atomar `… where twint_released_at is null`): Nummer + Betrag als Nachricht in den Verlauf und per Mail an den Käufer. Zweiter Klick ändert nichts.
- **Bar bei Abholung**: nur Preis anzeigen, Übergabe im Verlauf absprechen.

### 5.8 Melden und Moderation
- Melde-Button auf jedem Inserat (auch Gäste, reCAPTCHA + IP-Limit, Grund-Kacheln).
- **Ab 3 offenen Meldungen automatisch ausblenden** + Log-Eintrag + Admin-Benachrichtigung.
- Admin-Ansicht: Meldungs-Warteschlange (einblenden / zurückziehen / löschen / verwerfen), Gesuch-Warteschlange, Moderations-Log, Einstellungen.
- Branchenspezifisch verbotene Inhalte (in AGB + Vorprüfung): gestohlene Teile, Teile ohne Herkunft mit entfernter Seriennummer, **Airbags/Gurtstraffer (pyrotechnisch)**, Radarwarner/Blitzerwarner (in der Schweiz verboten), nicht zulassungsfähige Tuning-Teile ohne Hinweis, ganze Fahrzeuge (nur falls Kategorie später bewusst eröffnet), Gefahrgut (Altöl, Batterien nur mit Hinweis).

### 5.9 Bilder (Sicherheit + Speicher)
- Upload nur über eine Server Action (Login oder Gast-Flow), nie direkt in den Bucket. Bucket: `public read`, **kein** Insert/Update für `anon`/`authenticated`, Grössenlimit 2 MB, MIME nur `image/webp`/`image/jpeg`.
- Browser verkleinert vorab auf 1280 px (Qualität 0.8).
- Server: Data-URL prüfen (max. 8 MB), `sharp(...).metadata()` → **nur** `jpeg`, `png`, `webp`, `heif`, `avif`, `gif` (kein SVG/PDF/TIFF), `limitInputPixels: 50_000_000` (Dekompressions-Bomben), `failOn: 'error'`, `.rotate()` (EXIF-Ausrichtung), resize max. **1280 px**, **WebP q75**, **keine Metadaten** (kein `withMetadata()` → EXIF/GPS weg). Das Neu-Kodieren entfernt angehängten Code (Polyglot-Dateien).
- Max. **5 Fotos** pro Inserat, serverseitig erzwungen; nur URLs aus dem eigenen Bucket akzeptieren.
- Tests: Bild mit angehängtem `<?php …?><script>` → Ergebnis enthält den Code nicht; SVG, Shell-Text und abgeschnittenes JPEG werden abgelehnt; 4000×3000 → 1280 px, kein EXIF.

### 5.10 Texte nur als reiner Text
Zentrale Funktion `toPlainText()` vor dem Speichern **jedes** Freitexts (Titel, Beschreibung, Teilenummer, Tauschwunsch, Nachrichten, Anfragen, Gesuche, Mail-Antworten, Meldungsnotizen) — als `z.preprocess` in den Zod-Schemas:
- `<script|style|iframe|object|embed|svg|math>…</…>` samt Inhalt entfernen, HTML-Kommentare entfernen, alle Tags `</?[a-z!?][^<>]*>` entfernen,
- Steuerzeichen (ausser Zeilenumbruch/Tab) und unsichtbare Zeichen (Zero-Width, Bidi-Overrides U+202A–202E/2066–2069, BOM, Soft Hyphen) entfernen,
- `\r\n` → `\n`, max. eine Leerzeile, trimmen,
- normale Zeichen wie „< 40“ oder „A&B“ bleiben.
Anzeige zusätzlich immer escapen (React-Standard, in Mails `escapeHtml`).

---

## 6. Datenschutz und Sicherheit (Pflicht)

- **Öffentliche Daten nur über Whitelist-DTOs**: Nie `guest_email`, `requester_email`, `twint_phone`, `owner_user_id`, Telefon, IP im RSC-Payload oder in API-Antworten — auch nicht, wenn die Komponente das Feld nicht anzeigt. Test: JSON der öffentlichen Seite darf keine privaten Feldnamen/Werte enthalten.
- Öffentlicher Name: „Vorname N.“ (Privat), Firmenname (Gewerblich).
- Eigene Identität immer über `user.id`/Token bestimmen, **nie über eine nullable E-Mail** (`null === null` → fremde Daten).
- Gast-Tokens (Magic-Links): HMAC-signiert mit Ablauf (7 Tage), in der DB nur Hashes, Vergleich mit `timingSafeEqual`. Magic-Link-Anforderung immer gleiche Antwort („Falls es Inserate gibt, senden wir dir einen Link“), Rate-Limit.
- **Honeypot-Feld nicht `website` nennen** (Browser/Passwort-Manager füllen es automatisch aus → echte Nutzer werden still verworfen). Zufälliger Name wie `ag_hp_field` + `autoComplete="off"`, `data-1p-ignore`, `data-lpignore`, `data-bwignore`, `data-form-type="other"`, `tabIndex={-1}`, `aria-hidden`. Honeypot-Treffer serverseitig **loggen**.
- reCAPTCHA serverseitig fail-closed prüfen; bei Fehler verständliche Meldung, nie stiller Fake-Erfolg.
- Rate-Limits auf jede öffentliche Aktion (IP aus `cf-connecting-ip`, sonst `x-forwarded-for`).
- E-Mail-Eingaben: Zeilenumbrüche ablehnen (Header-Injection), Lookups mit `eq` statt `ilike` (`_` ist Wildcard).
- Server-Action-Antworten nie mit internen Fehlermeldungen.
- CSRF: API-Routen nur same-origin, ausser signierte Webhooks.

---

## 7. E-Mail-Versand (aus Erfahrung)

- **SMTP-Host per IPv4 auflösen** (`dns.lookup(host, { family: 4 })`) und IP + `tls.servername = host` an nodemailer geben, `connectionTimeout: 10_000`. Grund: nodemailer wählt zufällig zwischen IPv4 und IPv6; ist IPv6 aus dem Container nicht erreichbar, hängt jede zweite Mail **2 Minuten**.
- STARTTLS erzwingen (`requireTLS: true`), Zertifikat prüfen.
- SPF, DKIM, DMARC und Reverse-DNS (PTR) für die Absender-Domain sauber einrichten.
- Einheitliches, escaptes Mail-Layout (Überschrift, Text, optional Zitat-Block, ein Button, Fusszeile).
- Jede Benachrichtigung zusätzlich In-App (mit Konto) und optional Web-Push.
- Allowlist-Schalter für Testphase (`EMAIL_RECIPIENT_ALLOWLIST`), in Produktion leer.

---

## 8. Routen (Vorschlag)

```
/                         Landingpage (statisch, Scrollcraft, siehe 12)
/teile                    Marktplatz (Inserate | Gesuche)
/teile/[id]               Detail + Anfrage + TWINT-Karte + Melden
/teile/neu                Inserat-Wizard (Konto oder Gast)
/teile/meine              Meine Inserate/Anfragen/Gesuche (Konto) + Magic-Link-Formular
/teile/meine/[token]      Gast-Verwaltung per Magic-Link
/teile/anfrage/[token]    Gast-Verlauf einer Anfrage
/teile/gesuch/neu         Gesuch-Formular
/teile/gesuch/bestaetigen Gast-Gesuch bestätigen (per Klick)
/teile/twint-freigabe/[t] TWINT-Nummer freigeben (per Klick)
/anbieter/[slug]          Profil gewerblicher Anbieter
/admin/...                Moderation, Gesuche, Einstellungen, Log
/api/inbound/reply        Mail-Antworten (signiert)
/api/webhooks/stripe      Stripe
/api/cron/*               Reservierungen freigeben, Gesuch-Ablauf (mit CRON_SECRET)
/sitemap-teile.xml
/impressum /datenschutz /agb
```

---

## 9. Design

- Klar, technisch, vertrauenswürdig: dunkler Hero (Anthrazit/Asphalt), eine kräftige Akzentfarbe (z.B. Signalorange), viel Weissraum, grosse Produktfotos.
- **Kacheln mit Icons statt Dropdowns** für Kategorie, Zustand, Angebotsart, Saison, Meldegrund.
- **Reiter „Angebote / Gesuche“ gross und gut sichtbar** (nicht klein am Rand).
- Mobile first (Safe-Area beachten, Eingabefelder ≥ 16 px gegen iOS-Zoom), barrierearm (Labels, Fokus, Kontrast).
- Karten: Foto, Titel, Fahrzeug-Kurzinfo, Zustand, Preis/Angebotsart-Badge, Ort, „Gewerblich“-Badge.

---

## 10. Tests (Mindestumfang)

- Öffentliche Liste/Detail: keine privaten Felder im Payload.
- Anfrage als Gast: Captcha/Honeypot/Limits; Mails an beide Seiten; Reply-To-Adressen gültig.
- Mail-Eingang: gültige Antwort gespeichert; falsche Signatur 401; fremder Absender, Auto-Reply und gefälschte Adresse verworfen; abgeschlossene Anfrage → Info-Mail.
- TWINT: Nummer nie in Mails/Payload vor Freigabe; Freigabe-Link fälschungssicher, einmalig; nur Anbieter kann in der Übersicht freigeben.
- Bilder und Klartext-Filter (siehe 5.9/5.10).
- Gesuche: max. 5 Artikel, max. 10 offen, Treffer-Mail genau einmal, Ablauf/Erinnerung.
- Moderation: Auto-Ausblenden ab 3 Meldungen.
- Stripe: Preis aus DB, Webhook idempotent, Reservierung läuft ab.
- E2E (Playwright): Gast inseriert → bestätigt → anderer Gast fragt an → Antwort → Abschluss. Kein `networkidle` verwenden (`domcontentloaded` + kurze Wartezeit).

---

## 11. Rechtliches (Schweiz)

- Impressum (Firma, Adresse, UID), Datenschutzerklärung nach revDSG mit Liste der Auftragsverarbeiter (Hosting, Supabase, Stripe, Mailserver, reCAPTCHA, CDN), AGB (Plattform ist nur Vermittler, Gebühren, verbotene Artikel, Haftung, Gerichtsstand).
- Hinweis bei Gewerblichen: Gewährleistung nach OR gilt.
- Cookie-/Tracking-Hinweis nur falls Tracking genutzt wird.
- Vor jeder Änderung an AGB/Datenschutz den Text dem Betreiber zur Freigabe vorlegen.

---

## 12. Landingpage (Vorlage liegt bei: `landing-vorlage/`)

Die beiliegende Landingpage ist die produktive Seite der Sport-Tauschbörse („Zu klein. Passt genau.“). Übernimm **Aufbau, Scroll-Effekte und Technik**, ersetze **Inhalte, Bilder und Marke**:

- Technik: statisches `index.html` + `scrollcraft.css` + `scrollcraft.js` (Scroll-Engine: Abschnitte mit `data-sc-act="pin|flow"`, `data-sc-span`, CSS-Variable `--sc-p` für den Fortschritt). In Next.js unter `public/landing/` ablegen und `/` per Middleware-Rewrite darauf zeigen lassen, oder als eigene Seite einbinden, deren Styles auf einen Wrapper beschränkt sind (keine globalen `:root`/`body`-Styles im App-Bereich).
- Abschnitte übernehmen und umschreiben:
  1. **Hero (pin)** — Vorher/Nachher-Effekt. Neu z.B. „Steht im Keller. Fehlt in der Garage.“ mit zwei Bildern (Reifen im Keller ↔ montiert am Auto). Button „Zur Teilebörse“, Hinweis „Stöbern ohne Login“.
  2. **Wer abgibt** — „Foto, Fahrzeug, Zustand. Fertig.“: Kategorie, Zustand, **bis zu 5 Fotos**, Abholort/Versand.
  3. **Wer sucht** — „205/55 R16, in der Nähe.“: Filter nach Fahrzeug, Reifengrösse, Teilenummer, PLZ.
  4. **Wege (ohne/mit Geld)** — Tausch, Gratis, Verkauf online (Karte/TWINT über Plattform oder TWINT direkt ohne Gebühr, Nummer nur nach Freigabe), Bar bei Abholung.
  5. **Reichweite (pin)** — „Ganze Schweiz“ mit Kantonskacheln AG…ZH + FL.
  6. **Ohne Konto** — als Gast inserieren, Verwaltung per Link aus der Mail; später Konto → automatisch verknüpft.
  7. **Für Garagen & Händler** — Firmenprofil, Badge, Sammel-Import (statt „Für Vereine/Widget“).
  8. **Gesuche** — „Nicht gefunden? Gib ein Gesuch auf — wir melden uns, sobald es passt.“
  9. **Vertrauen** — Bewertungen nach Übergabe, verifiziert ab 20 Bewertungen, Meldefunktion, E-Mail-Adresse bleibt verborgen.
  10. **Abschluss (pin)** + Footer mit Impressum/Datenschutz/AGB.
- **Alle Amigoal-Inhalte entfernen**: Logo (`assets/amigoal-logo.svg`), Navigation „Rund um den Platz“, Fussball-Bilder (`boots`, `guards`, `jersey`, `platz`, `zu-klein`, `passt-genau`), Firmenangaben im Footer (Trifti GmbH …), Links auf amigoal.ch. Eigene Bilder als WebP (≤ 300 KB, 1600 px), eigenes Logo.
- Meta: eigener `<title>`, Description, OpenGraph-Bild, `lang="de-CH"`.
- Mobile prüfen (Pin-Abschnitte, Safe-Area), `prefers-reduced-motion` respektieren.

---

## 13. Lieferumfang und Phasen

1. Projekt-Setup, Datenmodell + Migrationen, RLS, Settings, Kategorien-Konstanten.
2. Öffentliche Liste/Detail mit Filtern, DTOs, SEO, Sitemap.
3. Inserat-Wizard (Konto + Gast), Bild-Pipeline, Klartext-Filter.
4. Anfragen, Verlauf, Mails, Magic-Links, Antwort per Mail.
5. Zahlung: Stripe + TWINT-Freigabe.
6. Gesuche inkl. Treffer-Mails, Freigabe, Ablauf-Cron.
7. Melden/Moderation/Admin, Bewertungen.
8. Gewerbliche Anbieter (Profil, Badge, CSV-Import).
9. Landingpage aus Vorlage, Rechtstexte.
10. E2E-Tests, Performance (Lighthouse ≥ 90 mobil), Security-Review, Deploy.

Nach jeder Phase: Tests grün, `next build` grün, kurze Anleitung „So testest du es“.
