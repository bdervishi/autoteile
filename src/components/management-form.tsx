"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import { requestManagementLink } from "@/app/teile/actions";
import { Honeypot } from "./honeypot";
import { captcha } from "./captcha";
export function ManagementForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  return (
    <SafeForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const f = new FormData(e.currentTarget);
          const result = await requestManagementLink({
            email: String(f.get("email")),
            ag_hp_field: String(f.get("ag_hp_field") || ""),
            captchaToken: await captcha("magic-link"),
          });
          setOk(result.ok);
          setMessage(result.ok ? result.data.message : result.error);
        } catch {
          setOk(false);
          setMessage("Die Sicherheitsprüfung konnte nicht geladen werden.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Honeypot />
      <label>
        Deine E-Mail-Adresse
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <button
        className="button primary"
        style={{ marginTop: 18 }}
        disabled={busy}
      >
        {busy ? "Bitte warten …" : "Zugangslink anfordern"}
      </button>
      {message && (
        <div
          role="status"
          className={`form-message ${ok ? "success-message" : ""}`}
        >
          {message}
        </div>
      )}
    </SafeForm>
  );
}
