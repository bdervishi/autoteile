"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import { signIn } from "@/app/auth/actions";
import { captcha } from "./captcha";
import { Honeypot } from "./honeypot";
export function LoginForm({ redirectTo }: { redirectTo?: "/admin" }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <SafeForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const f = new FormData(e.currentTarget);
          const result = await signIn({
            email: String(f.get("email")),
            redirectTo,
            ag_hp_field: String(f.get("ag_hp_field") || ""),
            captchaToken: await captcha("login"),
          });
          setMessage(result.ok ? result.data.message : result.error);
        } catch {
          setMessage("Die Sicherheitsprüfung konnte nicht geladen werden.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Honeypot />
      <label>
        E-Mail-Adresse
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <button
        className="button primary"
        disabled={busy}
        style={{ marginTop: 18 }}
      >
        Mit E-Mail anmelden
      </button>
      {message && (
        <div role="status" className="form-message">
          {message}
        </div>
      )}
    </SafeForm>
  );
}
