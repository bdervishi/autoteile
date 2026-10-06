# Scroll-Craft-Auslieferung

Die vorhandene Next.js-Landingpage wurde mit dem vollständig installierten Scroll-Craft-Skill überarbeitet. Autoritative Quelle ist `src/app/page.tsx`, mit `src/components/landing-runtime.tsx`, `src/components/tire-finder.tsx`, scoped `src/app/scrollcraft.css` und page-local CSS in `src/app/globals.css`. Die Engine unter `public/landing/scrollcraft.js` entspricht bytegleich dem Skill. MIT-Lizenz unter `public/landing/SCROLLCRAFT-LICENSE.txt`.

Grammatik: Werkstatt-Rundgang, aus der Nutzerreihenfolge abgeleitet. Warum die acht Standardgrammatiken nicht passen, Layervertrag, Verlauf, Gefühlskurve und Geräte-Score sind in BRIEF.md dokumentiert. Stilentscheidungen sind als Annahmen vermerkt, keine erfundenen Interviewantworten. Peak ist der Keller/Garage-Wechsel (2.7 vh), Signature die Größenauflösung in eine echte Reifensuche. Registry vorher leer, erste Zeile angehängt.

## Tatsächlich geprüft

- `npm test`: 38 bestanden.
- `npm run build`: bestanden inklusive TypeScript-Prüfung.
- Playwright: 16 bestanden (Desktop/Mobil), inklusive Scroll-Veränderung, Sticky-Position, veränderbarer Suche, reduced motion und JavaScript-off-Suche.
- Skill-Sampling: sechs Positionen je Szene und ergänzende Eintritts-/Austrittszustände. Finale Kontaktbögen visuell gelesen: `lab/desktop-final`, `lab/mobile-final`, `lab/compact-v3-final` (360 × 640), `lab/reduced-v3-final`. Jeweils keine Dead-scroll-Meldung; 50/50/52/48 Samples.
- Bildkorrekturen: ursprünglicher CSS-Override `position:relative` verhinderte Pins; entfernt. Kleine Handyansicht: komplettes Rad statt abgeschnittener Unterkante. Reduced motion: alle vier Angebote im Grid und keine sticky Überlappung. Frühere Berichte bleiben zur Nachvollziehbarkeit erhalten und sind superseded.
- Unveränderte Engine, Alpha-Metadaten des Radmotivs und Assetgrössen geprüft. Öffentliche Navigationsziele und Formübernahme in die echte Liste geprüft.

## Feel check

Gesehen vor Abgleich: Wiedererkennen → Erleichterung → Zutrauen → Präzision → Auswahl → Nähe → Entlastung → Ordnung/Hoffnung → Sicherheit → Bereitschaft. Gegen BRIEF: wesentlicher Unterschied war zuvor der leere Hero-Auslauf durch kaputtes Sticky; behoben. Die stille Gäste-Erklärung und der natürliche Abschluss bleiben bewusst ohne Pin. Abgeben-Kategorien und Suchformular geben praktische Orientierung nach dem Peak.

## Grenzen

Die Berichte führen abgebrochene Next.js-RSC-Prefetch-Requests auf. Keine Bild- oder Script-Anfrage davon betroffen; echte Navigation und Formfolgen wurden separat geprüft. Der Skill-Harness misst Kontrast an Cue-Markup; die Seite verwendet weitgehend stabile normale Texte, deshalb ist «keine Kontrastmeldung» keine vollständige Kontrastzertifizierung. Desktop und Handy wurden in Chromium emuliert; ein echtes iPhone, Touch-Scrolling und Produktivhosting wurden nicht geprüft. Bestehende offene Backend-/Produktfunktionen aus README sind durch diese Landingpage-Arbeit nicht abgeschlossen.

## Assets

Built-in Imagegen: Kellerfoto ohne Räder und einzelnes Winterrad mit dunkler Alufelge, echte Transparenz inklusive Spokendurchbrüchen, ganze Silhouette und Kontaktschatten. Prompts und finale lokale Assetpfade stehen in README. Beide finalen WebP-Dateien unter 300 KB; originale Generationen unverändert erhalten.

Vorschau: http://127.0.0.1:3000/

## Revision: deutlich sichtbare Animationen

Auf die ausdrückliche Nutzerkorrektur hin wurden Radrotation und seitliche Bewegung, Foto-Zoom, die gestaffelten Kategorien, kinetische Überschrift, Suchformular-Perspektive und Kantonsbewegung verstärkt. Die Engine bleibt unverändert. Der ursprüngliche Zeilenumbruch in der kinetischen Überschrift erzeugte beim Text-Splitting einen fehlenden Wortabstand; ein zusammenhängender Textknoten behebt das.

Die Kontaktbögen `lab/expressive-desktop` (50 Samples), `lab/expressive-mobile` (50) und `lab/expressive-reduced` (48) wurden visuell geprüft. Keine Dead-scroll-Meldungen. Nach der Textkorrektur meldete der Desktop-Harness einen kurzzeitig zu geringen Cue-Kontrast (2.99:1); die Überschrift erhält deshalb volle Startdeckkraft. Reduced motion zeigt die Inhalte ohne die neuen Bewegungen. Die stärkere Revision erhält die funktionierende Suche und die mobilen Kompositionen. Build und 16 Desktop-/Mobiltests sind erneut bestanden.
