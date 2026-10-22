// Go-live checks without framework imports: used by /admin and `npm run check:launch`.
// Only reports whether values are present and plausible, never the values themselves.
export type LaunchCheck = {
  area: string;
  label: string;
  ok: boolean;
  blocking: boolean;
  hint: string;
};
type Env = Record<string, string | undefined>;
function host(origin: string | undefined) {
  try {
    return origin ? new URL(origin).hostname : "";
  } catch {
    return "";
  }
}
function secret(value: string | undefined) {
  return !!value && value.length >= 32;
}
export function launchChecks(env: Env): LaunchCheck[] {
  const originHost = host(env.APP_ORIGIN);
  return [
    {
      area: "Datenbank",
      label: "Supabase verbunden",
      ok: !!(
        env.NEXT_PUBLIC_SUPABASE_URL &&
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        env.SUPABASE_SERVICE_ROLE_KEY
      ),
      blocking: true,
      hint: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY setzen; alle Migrationen ausführen.",
    },
    {
      area: "Sicherheit",
      label: "Token- und IP-Secrets",
      ok: secret(env.TOKEN_SECRET) && secret(env.IP_HASH_SECRET),
      blocking: true,
      hint: "TOKEN_SECRET und IP_HASH_SECRET je mit `openssl rand -hex 32` erzeugen.",
    },
    {
      area: "Adresse",
      label: "Öffentliche HTTPS-Adresse",
      ok: !!env.APP_ORIGIN?.startsWith("https://") && !!originHost,
      blocking: true,
      hint: "APP_ORIGIN auf die echte Adresse setzen, z. B. https://partvivo.ch. Links in Mails und geteilte Links nutzen sie.",
    },
    {
      area: "E-Mail",
      label: "SMTP-Versand",
      ok: !!(
        env.SMTP_HOST &&
        env.SMTP_USER &&
        env.SMTP_PASSWORD &&
        env.SMTP_FROM
      ),
      blocking: true,
      hint: "Ohne SMTP kann niemand inserieren: Gäste bestätigen ihr Inserat per Mail.",
    },
    {
      area: "E-Mail",
      label: "Keine Test-Empfängerliste aktiv",
      ok: !env.EMAIL_RECIPIENT_ALLOWLIST?.trim(),
      blocking: true,
      hint: "EMAIL_RECIPIENT_ALLOWLIST im Live-Betrieb leer lassen, sonst erhalten nur gelistete Adressen Mails.",
    },
    {
      area: "Spam-Schutz",
      label: "reCAPTCHA v3",
      ok: !!(
        env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY &&
        env.RECAPTCHA_SECRET_KEY &&
        env.RECAPTCHA_HOSTNAME
      ),
      blocking: true,
      hint: "Ohne reCAPTCHA werden Gast-Inserate, Uploads und Anfragen abgelehnt (fail closed).",
    },
    {
      area: "Spam-Schutz",
      label: "reCAPTCHA-Host passt zur Adresse",
      ok: !!originHost && env.RECAPTCHA_HOSTNAME === originHost,
      blocking: true,
      hint: "RECAPTCHA_HOSTNAME muss exakt dem Host aus APP_ORIGIN entsprechen.",
    },
    {
      area: "Teilen & Google",
      label: "Echte Domain (Indexierung aktiv)",
      ok: !!env.BRAND_DOMAIN && !env.BRAND_DOMAIN.endsWith(".example"),
      blocking: false,
      hint: "BRAND_DOMAIN ohne Protokoll setzen (z. B. partvivo.ch). Mit .example bleibt die Seite für Suchmaschinen gesperrt.",
    },
    {
      area: "Betrieb",
      label: "Wartungs-Cron",
      ok: secret(env.CRON_SECRET),
      blocking: false,
      hint: "CRON_SECRET setzen. Der tägliche Job versendet Wiederholungen, Gesuch-Treffer und Ablauf-Erinnerungen.",
    },
    {
      area: "E-Mail",
      label: "Antworten per Mail (Postal)",
      ok: !!env.REPLY_DOMAIN && !!env.POSTAL_JWKS_URL?.startsWith("https://"),
      blocking: false,
      hint: "Optional. Ohne Postal schreiben Käufer und Verkäufer über den persönlichen Link im Web.",
    },
  ];
}
