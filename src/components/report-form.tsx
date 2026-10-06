"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import { Flag } from "lucide-react";
import { Honeypot } from "./honeypot";
import { captcha } from "./captcha";
import { reportItem } from "@/app/teile/trade.actions";
const reasons = {
  betrug: "Betrug",
  gestohlen: "Gestohlen",
  verboten: "Verbotener Artikel",
  unangemessen: "Unangemessen",
  spam: "Spam",
  falsche_angaben: "Falsche Angaben",
  sonstiges: "Sonstiges",
};
export function ReportForm({ id }: { id: string }) {
  const [reason, setReason] = useState("betrug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details>
      <summary className="text-link">
        <Flag size={14} style={{ display: "inline" }} /> Inserat melden
      </summary>
      <SafeForm
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const f = new FormData(e.currentTarget);
            const result = await reportItem({
              item_id: id,
              reason,
              note: String(f.get("note") || ""),
              ag_hp_field: String(f.get("ag_hp_field") || ""),
              captchaToken: await captcha("report"),
            });
            setMessage(
              result.ok ? "Danke. Deine Meldung wird geprüft." : result.error,
            );
          } catch {
            setMessage("Die Sicherheitsprüfung konnte nicht geladen werden.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Honeypot />
        <div className="tile-grid" style={{ marginTop: 20 }}>
          {Object.entries(reasons).map(([r, label]) => (
            <button
              type="button"
              key={r}
              onClick={() => setReason(r)}
              className={`tile ${r === reason ? "selected" : ""}`}
              aria-pressed={r === reason}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          Weitere Angaben
          <textarea name="note" maxLength={1000} />
        </label>
        <button className="button" style={{ marginTop: 15 }} disabled={busy}>
          {busy ? "Bitte warten …" : "Meldung senden"}
        </button>
        {message && (
          <div role="status" className="form-message">
            {message}
          </div>
        )}
      </SafeForm>
    </details>
  );
}
