# PARTVIVO – Status und Go-live

Stand: 22. Oktober 2026. Kurzüberblick, was vorhanden ist und was für Inserate noch fehlt. Details zum Funktionsumfang stehen in `README.md`.

## Kurzfazit

| Bereich | Stand |
| --- | --- |
| Code für Inserate (Erfassen, Fotos, Bestätigen, Anzeigen) | ✅ fertig, getestet |
| Teilen von Inseraten (WhatsApp, Facebook, E-Mail, Link, Handy-Teilen, Link-Vorschau mit Foto) | ✅ fertig |
| Anfragen an Verkäufer | ✅ fertig, läuft auch ohne eigenen Mailserver |
| Mailversand | ✅ sofort nach jeder Aktion; täglicher Cron fängt Wiederholungen auf |
| **Infrastruktur (Supabase, SMTP, reCAPTCHA, Vercel, Domain)** | ❌ **nicht eingerichtet: blockiert den Live-Betrieb** |
| Rechtstexte (AGB, Datenschutz, Impressum) | ⚠️ nur Platzhalter; vor öffentlichem Start freigeben |
| Online-Zahlung (Stripe) | ⏸️ bewusst deaktiviert; TWINT-Direkt funktioniert |

**Ohne die Infrastruktur nimmt die Seite keine Inserate an.** Sie zeigt dann nur Beispielinserate und eine ehrliche Meldung «noch nicht eingerichtet». Fortschritt prüfen:

```sh
npm run check:launch        # liest .env.local, zeigt OK / FEHLT / OFFEN
```

Nach dem Deployment zeigt `/admin` (Adminrolle) denselben Systemstatus und die E-Mail-Warteschlange.

## Go-live-Checkliste für Inserate

Reihenfolge einhalten. Jeder Punkt ist mit `npm run check:launch` überprüfbar.

1. **Domain festlegen** (z. B. `partvivo.ch`). Daraus folgen `APP_ORIGIN=https://partvivo.ch`, `BRAND_DOMAIN=partvivo.ch` und `RECAPTCHA_HOSTNAME=partvivo.ch`.
2. **Supabase-Projekt** in der EU-Region (z. B. Zürich/Frankfurt) anlegen.
   - Alle Dateien aus `supabase/migrations/` in Namensreihenfolge im SQL-Editor ausführen.
   - URL, Anon-Key und Service-Role-Key notieren.
   - Auth → URL-Konfiguration: Site URL = `APP_ORIGIN`, Redirect `APP_ORIGIN/auth/callback`.
   - Auth → SMTP: denselben SMTP-Zugang wie unten eintragen (der eingebaute Supabase-Versand ist auf wenige Mails pro Stunde begrenzt).
3. **SMTP-Zugang** (z. B. Infomaniak, Brevo, Postmark) mit Absender auf der eigenen Domain. SPF, DKIM und DMARC im DNS setzen, sonst landen Bestätigungsmails im Spam.
4. **reCAPTCHA v3** unter google.com/recaptcha/admin für die Domain anlegen. Ohne reCAPTCHA lehnt die Seite Gast-Inserate, Foto-Uploads und Anfragen ab.
5. **Secrets erzeugen**: `TOKEN_SECRET`, `IP_HASH_SECRET` und `CRON_SECRET` je mit `openssl rand -hex 32`.
6. **Vercel**: Repository verbinden, alle Variablen aus `.env.example` als Production-Variablen setzen, Domain verbinden. `EMAIL_RECIPIENT_ALLOWLIST` leer lassen, Stripe-Variablen leer lassen.
7. **Admin-Konto**: unter `/admin` anmelden, dann in Supabase `profiles.role` für dieses Konto auf `admin` setzen.
8. **Rechtstexte** unter `/impressum`, `/datenschutz` und `/agb` mit echten Betreiberangaben ersetzen.
9. **Live-Test** (unten) durchführen.

Postal (`REPLY_DOMAIN`, `POSTAL_JWKS_URL`) ist **optional**. Ohne Postal schreiben Käufer und Verkäufer über ihren persönlichen Link. Die Mails weisen darauf hin, nicht direkt zu antworten.

## Live-Test nach der Einrichtung

Mit zwei echten Mailadressen (A = Verkäufer, B = Käufer), am besten auf dem Handy:

1. A erstellt unter `/teile/neu` als Gast ein Inserat mit Foto. Die Bestätigungsmail kommt innert einer Minute.
2. A klickt den Link → «Inserat jetzt bestätigen» → «Inserat ansehen». Das Inserat steht unter `/teile`.
3. A teilt den Link per WhatsApp: Die Vorschau zeigt Titel, Preis, Ort und Foto.
4. B öffnet den Link und sendet eine Anfrage. A und B erhalten je eine Mail mit persönlichem Verlauf.
5. A sagt im Verlauf zu, B sieht den neuen Status per Mail.
6. In `/admin`: Systemstatus komplett grün, E-Mail-Warteschlange ohne Fehler.

## In diesem Durchgang behoben

- **Mails gingen nur einmal täglich raus (max. 5).** Der Versand lief ausschliesslich über den Cron, und Vercel Hobby erlaubt nur einen täglichen Lauf. Gäste hätten ihre Bestätigungsmail bis zu 24 Stunden später erhalten. Jetzt sendet jede Aktion ihre Mails direkt nach der Antwort. Der tägliche Cron arbeitet nur noch Rückstände und Wiederholungen ab, bis zu 100 Mails pro Lauf.
- **Anfragen brauchten zwingend einen Postal-Mailserver.** Jetzt sind sie auch ohne Postal möglich.
- **Teilen**: Teilen-Buttons auf jeder Inseratseite und direkt nach dem Veröffentlichen. Link-Vorschau (Open Graph/Twitter) mit erstem Foto, Preis und Ort; kanonische URL.
- **Bereitschaftscheck**: `npm run check:launch` und Systemstatus im Adminbereich.

## Offen – nach Priorität

**Vor öffentlichem Start**
- Infrastruktur gemäss Checkliste (oben).
- Rechtstexte mit Betreiberangaben.
- Live-Test mit zwei echten Konten.

**Kurz nach Start (Komfort, nicht blockierend)**
- Eigene Inserate bearbeiten (heute nur zurückziehen und neu erfassen).
- TWINT-Freigabe direkt aus der Kontoübersicht.
- Link-Vorschau: Fotos sind WebP. Facebook und neuere WhatsApp-Versionen zeigen das an, ältere Clients evtl. nicht. Optional eine JPEG-Vorschau erzeugen.
- Gesuche: Reifen- und Baujahr-Felder, Konto-Flow ohne Gastbestätigung, Zurückziehen/Erfüllen in der Übersicht.

**Später**
- Stripe Checkout/Connect. Vorher klären: Wer zahlt die Gebühr, wie wird an Verkäufer ausbezahlt?
- CSV-Sammelimport für Händler, Web-Push.
- Lösch- und Aufbewahrungsregel für entfernte Inhalte.

## Entscheidungen, die der Betreiber treffen muss

1. Domain und Absenderadresse (z. B. `hallo@partvivo.ch`).
2. SMTP-Anbieter.
3. Betreiberangaben für Impressum und Datenschutz.
4. Ob Gast-Inserate ohne Konto zum Start erlaubt bleiben (Standard: ja; umschaltbar unter `/admin` → Einstellungen).
