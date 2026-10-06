"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import { createBusiness } from "@/app/anbieter/actions";
import { CANTONS } from "@/lib/constants";
import Link from "next/link";
export function BusinessForm() {
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <SafeForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const f = new FormData(e.currentTarget);
          const read = (n: string) => String(f.get(n) || "");
          const result = await createBusiness({
            name: read("name"),
            uid_number: read("uid"),
            address: read("address"),
            zip: read("zip"),
            city: read("city"),
            canton: read("canton"),
            website: read("website") || undefined,
          });
          if (result.ok) setSlug(result.data.slug);
          else setMessage(result.error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <label className="full">
          Firmenname
          <input name="name" required minLength={2} maxLength={120} />
        </label>
        <label>
          UID-Nummer
          <input
            name="uid"
            required
            pattern="CHE-[0-9]{3}\.[0-9]{3}\.[0-9]{3}"
            placeholder="CHE-123.456.789"
          />
        </label>
        <label>
          Website (optional)
          <input name="website" type="url" placeholder="https://" />
        </label>
        <label className="full">
          Geschäftsadresse
          <input name="address" required maxLength={200} />
        </label>
        <label>
          PLZ
          <input
            name="zip"
            required
            pattern="[0-9]{4}"
            inputMode="numeric"
            maxLength={4}
          />
        </label>
        <label>
          Ort
          <input name="city" required maxLength={100} />
        </label>
        <label>
          Kanton
          <select name="canton">
            {CANTONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="hint" style={{ marginTop: 18 }}>
        Firmenname, Geschäftsadresse und UID werden auf deinem öffentlichen
        Profil angezeigt.
      </p>
      <button className="button primary" disabled={busy || !!slug}>
        {busy ? "Bitte warten …" : "Firmenprofil erstellen"}
      </button>
      {slug && (
        <p>
          <Link className="text-link" href={`/anbieter/${slug}`}>
            Firmenprofil ansehen
          </Link>
        </p>
      )}
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </SafeForm>
  );
}
