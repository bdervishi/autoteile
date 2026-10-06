"use client";
import { useState } from "react";
import { SafeForm } from "./safe-form";
import { Honeypot } from "./honeypot";
import { captcha } from "./captcha";
import { requestCommercialOffer } from "@/app/preise/actions";
import { COMMERCIAL_OFFERS } from "@/lib/monetization";
export function CommercialRequestForm({
  initialOffer = "starter",
  initialItem = "",
  enabled = false,
  items = [],
}: {
  initialOffer?: string;
  initialItem?: string;
  enabled?: boolean;
  items?: { id: string; title: string }[];
}) {
  const [offer, setOffer] = useState(
    initialOffer in COMMERCIAL_OFFERS ? initialOffer : "starter",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <SafeForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const f = new FormData(e.currentTarget);
          const r = await requestCommercialOffer({
            offer,
            name: String(f.get("name") || ""),
            note: String(f.get("note") || ""),
            itemId: String(f.get("itemId") || ""),
            ag_hp_field: String(f.get("ag_hp_field") || ""),
            captchaToken: await captcha("commercial_request"),
          });
          setMessage(r.ok ? r.data.message : r.error);
        } catch {
          setMessage(
            "Die Sicherheitsprüfung konnte nicht geladen werden. Es wurde nichts berechnet.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <Honeypot />
      <label>
        Interesse an
        <select
          name="offer"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
        >
          {Object.entries(COMMERCIAL_OFFERS).map(([id, o]) => (
            <option key={id} value={id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Name oder Firmenname
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="organization"
        />
      </label>
      {offer === "boost" && (
        <label>
          Dein Inserat
          <select name="itemId" required defaultValue={initialItem}>
            <option value="">Inserat auswählen</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Nachricht
        <textarea
          name="note"
          maxLength={1000}
          rows={4}
          placeholder="Region, Bestand oder gewünschte Zusammenarbeit"
        />
      </label>
      <p className="hint">
        Unverbindliche Pilotanfrage. Kein Vertragsabschluss, keine automatische
        Zahlung. Wir verwenden deine Konto-E-Mail für die Rückmeldung.
      </p>
      <button className="button primary" disabled={!enabled || busy}>
        {busy ? "Wird gesendet …" : "Unverbindlich anfragen"}
      </button>
      {!enabled && (
        <p className="hint">
          Anfragen sind nach Einrichtung und Anmeldung verfügbar.
        </p>
      )}
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </SafeForm>
  );
}
