"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import { updateSettings } from "@/app/admin/actions";
import { DEFAULT_SETTINGS } from "@/lib/constants";
export function SettingsForm({
  settings,
}: {
  settings: typeof DEFAULT_SETTINGS;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <SafeForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        const result = await updateSettings({
          guestListingsEnabled: f.has("guest"),
          ratingEnabled: f.has("ratings"),
          stripeSaleEnabled: false,
          twintDirectEnabled: f.has("twint"),
          maxPhotosPerListing: Number(f.get("photos")),
          platformFeePercent: Number(f.get("fee")),
          guestListingsPerIpPerDay: Number(f.get("limit")),
          wantedEnabled: f.has("wanted"),
        });
        setMessage(result.ok ? result.data.message : result.error);
        setBusy(false);
      }}
    >
      <div className="form-grid">
        <label className="check">
          <input
            type="checkbox"
            name="guest"
            defaultChecked={settings.guestListingsEnabled}
          />
          Gast-Inserate aktiv
        </label>
        <label className="check">
          <input
            type="checkbox"
            name="ratings"
            defaultChecked={settings.ratingEnabled}
          />
          Bewertungen aktiv
        </label>
        <label className="check">
          <input
            type="checkbox"
            name="twint"
            defaultChecked={settings.twintDirectEnabled}
          />
          TWINT direkt aktiv
        </label>
        <label className="check">
          <input
            type="checkbox"
            name="wanted"
            defaultChecked={settings.wantedEnabled}
          />
          Gesuche aktiv
        </label>
        <label>
          Fotos pro Inserat
          <input
            type="number"
            name="photos"
            min="1"
            max="5"
            defaultValue={settings.maxPhotosPerListing}
          />
        </label>
        <label>
          Plattform-Gebühr (%)
          <input
            type="number"
            name="fee"
            min="0"
            max="30"
            step=".1"
            defaultValue={settings.platformFeePercent}
          />
        </label>
        <label>
          Gast-Inserate pro IP und Tag
          <input
            type="number"
            name="limit"
            min="1"
            max="20"
            defaultValue={settings.guestListingsPerIpPerDay}
          />
        </label>
      </div>
      <p className="hint" style={{ marginTop: 18 }}>
        Stripe bleibt gesperrt, bis Gebühren- und Auszahlungsmodell eingerichtet
        sind.
      </p>
      <button className="button primary" disabled={busy}>
        Einstellungen speichern
      </button>
      {message && (
        <div className="form-message" role="status">
          {message}
        </div>
      )}
    </SafeForm>
  );
}
