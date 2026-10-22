// Prüft die Umgebungsvariablen für den Go-live, ohne Werte auszugeben.
// Lokal: `npm run check:launch` (liest .env.local). Für Vercel vorher `vercel env pull .env.local`.
import { launchChecks } from "../src/lib/readiness.ts";
const checks = launchChecks(process.env);
let blocked = 0;
for (const check of checks) {
  const mark = check.ok ? "OK   " : check.blocking ? "FEHLT" : "OFFEN";
  console.log(`${mark}  ${check.area} · ${check.label}`);
  if (!check.ok) console.log(`       ${check.hint}`);
  if (!check.ok && check.blocking) blocked++;
}
console.log(
  blocked
    ? `\n${blocked} Punkt(e) blockieren das Entgegennehmen von Inseraten.`
    : "\nKonfiguration bereit für Inserate. Danach den Live-Ablauf aus docs/STATUS.md testen.",
);
process.exitCode = blocked ? 1 : 0;
