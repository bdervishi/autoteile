"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import type { PublicItem } from "@/lib/listing.types";
import { Honeypot } from "./honeypot";
import { captcha } from "./captcha";
import { sendInquiry } from "@/app/teile/trade.actions";
export function InquiryForm({ item }: { item: PublicItem }) {
  const [twint, setTwint] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  return (
    <>
      <div className="panel" id="anfrage">
        <h2>Interesse? Schreib eine Nachricht.</h2>
        {item.payment_mode === "twint-direct" && (
          <div className="form-message">
            <strong>TWINT-Direktzahlung</strong>
            <p className="hint">
              Die Nummer wird erst nach persönlicher Freigabe des Anbieters
              sichtbar.
            </p>
            <button
              type="button"
              className="button"
              onClick={() => setTwint(true)}
            >
              Per TWINT kaufen
            </button>
          </div>
        )}
        <SafeForm
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const f = new FormData(e.currentTarget);
              const result = await sendInquiry({
                item_id: item.id,
                requester_name: String(f.get("name")),
                requester_email: String(f.get("email")),
                message: String(f.get("message")),
                offer_back: String(f.get("offer_back") || ""),
                twint_requested: twint,
                ag_hp_field: String(f.get("ag_hp_field") || ""),
                captchaToken: await captcha("inquiry"),
              });
              setOk(result.ok);
              setMessage(result.ok ? result.data.message : result.error);
            } catch {
              setMessage("Die Sicherheitsprüfung konnte nicht geladen werden.");
              setOk(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Honeypot />
          <div className="form-grid">
            <label>
              Dein Name
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label>
              Deine E-Mail
              <input name="email" required type="email" autoComplete="email" />
            </label>
            <label className="full">
              Nachricht
              <textarea
                name="message"
                required
                minLength={2}
                maxLength={2000}
                placeholder="Hallo, ist das Teil noch verfügbar?"
              />
            </label>
            {item.offer_type === "tausch" && (
              <label className="full">
                Dein Gegenangebot
                <input name="offer_back" maxLength={120} />
              </label>
            )}
            {item.payment_mode === "twint-direct" && (
              <label className="check full">
                <input
                  type="checkbox"
                  checked={twint}
                  onChange={(e) => setTwint(e.target.checked)}
                />
                Ich möchte per TWINT bezahlen
              </label>
            )}
          </div>
          <button
            className="button primary"
            disabled={busy || ok}
            style={{ marginTop: 18 }}
          >
            {busy
              ? "Bitte warten …"
              : twint
                ? "Kaufanfrage senden"
                : "Anfrage senden"}
          </button>
          {message && (
            <div
              role="status"
              className={`form-message ${ok ? "success-message" : ""}`}
            >
              {message}
            </div>
          )}
          <p className="hint" style={{ marginTop: 15, marginBottom: 0 }}>
            Deine E-Mail-Adresse bleibt verborgen. Den Verlauf erhältst du per
            persönlichem Link.
          </p>
        </SafeForm>
      </div>
    </>
  );
}
