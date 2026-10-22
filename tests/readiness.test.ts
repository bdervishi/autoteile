import { it, expect } from "vitest";
import { launchChecks } from "@/lib/readiness";
const secret = "a".repeat(32);
const live = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "svc-role-x91",
  TOKEN_SECRET: secret,
  IP_HASH_SECRET: secret,
  CRON_SECRET: secret,
  APP_ORIGIN: "https://partvivo.ch",
  BRAND_DOMAIN: "partvivo.ch",
  SMTP_HOST: "smtp.example.ch",
  SMTP_USER: "user",
  SMTP_PASSWORD: "smtp-pw-x92",
  SMTP_FROM: "PARTVIVO <hallo@partvivo.ch>",
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "site",
  RECAPTCHA_SECRET_KEY: "secret",
  RECAPTCHA_HOSTNAME: "partvivo.ch",
};
const blocking = (env: Record<string, string>) =>
  launchChecks(env)
    .filter((c) => c.blocking && !c.ok)
    .map((c) => c.label);
it("accepts a complete launch configuration without Postal", () => {
  expect(blocking(live)).toEqual([]);
});
it("blocks posting when mail, captcha host or HTTPS origin are wrong", () => {
  expect(blocking({ ...live, SMTP_PASSWORD: "" })).toEqual(["SMTP-Versand"]);
  expect(blocking({ ...live, RECAPTCHA_HOSTNAME: "www.partvivo.ch" })).toEqual([
    "reCAPTCHA-Host passt zur Adresse",
  ]);
  expect(blocking({ ...live, APP_ORIGIN: "http://partvivo.ch" })).toContain(
    "Öffentliche HTTPS-Adresse",
  );
  expect(blocking({ ...live, TOKEN_SECRET: "short" })).toEqual([
    "Token- und IP-Secrets",
  ]);
  expect(blocking({ ...live, EMAIL_RECIPIENT_ALLOWLIST: "a@b.ch" })).toEqual([
    "Keine Test-Empfängerliste aktiv",
  ]);
});
it("never echoes configured values", () => {
  const text = JSON.stringify(launchChecks(live));
  for (const value of ["svc-role-x91", "smtp-pw-x92", secret])
    expect(text).not.toContain(value);
});
