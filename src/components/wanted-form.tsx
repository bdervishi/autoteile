"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
} from "@/lib/constants";
import { CategoryIcon } from "./icons";
import { Honeypot } from "./honeypot";
import { captcha } from "./captcha";
import { createWanted, confirmWanted } from "@/app/teile/wanted.actions";
export function WantedForm() {
  const [articles, setArticles] = useState([
    { category: "reifen" as (typeof CATEGORIES)[number], key: 0 },
  ]);
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
          const read = (n: string) => String(f.get(n) || "");
          const result = await createWanted({
            group_title: read("title"),
            owner_name: read("name"),
            guest_email: read("email"),
            pickup_zip: read("zip"),
            note: read("note"),
            ag_hp_field: read("ag_hp_field"),
            captchaToken: await captcha("wanted"),
            articles: articles.map((a, i) => ({
              category: a.category,
              make: read(`make-${i}`),
              model: read(`model-${i}`),
              oem_number: read(`oem-${i}`),
              min_condition: read(`condition-${i}`),
              offer: read(`offer-${i}`),
              max_price_chf: read(`price-${i}`) || undefined,
            })),
          });
          setOk(result.ok);
          setMessage(result.ok ? result.data.message : result.error);
        } catch {
          setMessage("Die Sicherheitsprüfung konnte nicht geladen werden.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Honeypot />
      <div className="form-grid">
        <label className="full">
          Titel für dein Gesuch
          <input
            name="title"
            required
            minLength={2}
            maxLength={120}
            placeholder="z. B. Winterräder für meinen Golf"
          />
        </label>
      </div>
      {articles.map((a, i) => (
        <section className="panel" key={a.key} style={{ marginTop: 24 }}>
          <h2>Artikel {i + 1}</h2>
          <div className="tile-grid">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() =>
                  setArticles((v) =>
                    v.map((a, j) => (i === j ? { ...a, category: c } : a)),
                  )
                }
                className={`tile ${a.category === c ? "selected" : ""}`}
                aria-pressed={a.category === c}
              >
                <CategoryIcon category={c} />
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label>
              Fahrzeugmarke
              <input name={`make-${i}`} maxLength={60} />
            </label>
            <label>
              Modell
              <input name={`model-${i}`} maxLength={80} />
            </label>
            <label>
              OEM-Teilenummer
              <input name={`oem-${i}`} maxLength={100} />
            </label>
            <label>
              Mindestzustand
              <select name={`condition-${i}`} defaultValue="gebraucht_gut">
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ich möchte
              <select name={`offer-${i}`}>
                <option value="kauf">Kaufen</option>
                <option value="tausch">Tauschen</option>
                <option value="gratis">Geschenkt erhalten</option>
              </select>
            </label>
            <label>
              Höchstpreis (CHF)
              <input name={`price-${i}`} type="number" min="0" step=".05" />
            </label>
          </div>
          {articles.length > 1 && (
            <button
              type="button"
              className="text-link"
              style={{ marginTop: 12 }}
              onClick={() => setArticles((v) => v.filter((_, j) => i !== j))}
            >
              Artikel entfernen
            </button>
          )}
        </section>
      ))}
      <button
        type="button"
        className="button"
        disabled={articles.length >= 5}
        onClick={() =>
          setArticles((v) => [...v, { category: "reifen", key: Date.now() }])
        }
      >
        Weiteren Artikel hinzufügen ({articles.length}/5)
      </button>
      <div className="form-grid" style={{ marginTop: 28 }}>
        <label className="full">
          Gemeinsame Notiz
          <textarea name="note" maxLength={200} />
        </label>
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
          E-Mail-Adresse
          <input name="email" required type="email" autoComplete="email" />
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
      </div>
      <p className="hint" style={{ marginTop: 18 }}>
        Dein Gesuch wird nach E-Mail-Bestätigung geprüft. Nach Freigabe gilt es
        30 Tage. Du kannst höchstens 10 offene Gesuch-Artikel haben.
      </p>
      <button className="button primary" disabled={busy || ok}>
        {busy ? "Bitte warten …" : "Gesuch aufgeben"}
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
export function WantedConfirmation({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        className="button primary"
        disabled={done}
        onClick={async () => {
          const result = await confirmWanted(token);
          setDone(result.ok);
          setMessage(result.ok ? result.data.message : result.error);
        }}
      >
        Gesuch jetzt bestätigen
      </button>
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </>
  );
}
