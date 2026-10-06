"use client";
import { SafeForm } from "./safe-form";
import { useEffect, useState } from "react";
import {
  Plus,
  Camera,
  ArrowRight,
  Check,
  Gift,
  Repeat2,
  Banknote,
  CreditCard,
} from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  OFFERS,
  OFFER_LABELS,
  CANTONS,
} from "@/lib/constants";
import { CategoryIcon } from "./icons";
import { Honeypot } from "./honeypot";
import { captcha } from "./captcha";
import { createListing, uploadPhoto } from "@/app/teile/actions";
import type { Fit } from "@/lib/listing.types";
export function ListingWizard({
  prefill,
  businesses = [],
}: {
  businesses?: { id: string; name: string }[];
  prefill?: {
    id: string;
    category: (typeof CATEGORIES)[number];
    title: string;
    make: string;
    model: string;
    year: number | null;
    oem_number: string;
  };
}) {
  const [businessId, setBusinessId] = useState("");
  const [zip, setZip] = useState("");
  const [canton, setCanton] = useState("");
  const [postcode, setPostcode] = useState<{
    cantons: string[];
    cities: string[];
  } | null>(null);
  useEffect(() => {
    setPostcode(null);
    if (!/^\d{4}$/.test(zip)) return;
    const controller = new AbortController();
    fetch(`/api/postcodes?zip=${zip}`, { signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((info) => {
        setPostcode(info);
        if (info?.cantons.length === 1) setCanton(info.cantons[0]);
        else if (info) setCanton("");
      })
      .catch(() => {});
    return () => controller.abort();
  }, [zip]);

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    prefill?.category || "reifen",
  );
  const [condition, setCondition] =
    useState<(typeof CONDITIONS)[number]>("gebraucht_gut");
  const [offer, setOffer] = useState<(typeof OFFERS)[number]>("verkauf_bar");
  const [season, setSeason] = useState("winter");
  const [payment, setPayment] = useState("twint-direct");
  const [fits, setFits] = useState<Fit[]>(
    prefill?.make && prefill.model
      ? [
          {
            make: prefill.make,
            model: prefill.model,
            year_from: prefill.year || 2000,
            year_to: prefill.year || 2026,
          },
        ]
      : [],
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  async function upload(files: FileList | null) {
    if (!files) return;
    if (photos.length + files.length > 5) {
      setError("Du kannst höchstens 5 Fotos hinzufügen.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/"))
          throw new Error("Bitte eine Bilddatei auswählen.");
        const image = await createImageBitmap(file);
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas
          .getContext("2d")!
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        image.close();
        const result = await uploadPhoto(
          canvas.toDataURL("image/jpeg", 0.8),
          await captcha("upload"),
        );
        if (!result.ok) throw new Error(result.error);
        added.push(result.data.url);
      }
      setPhotos((p) => [...p, ...added]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Der Upload ist fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (step < 2) {
      if (!form.reportValidity()) return;
      setStep((s) => s + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const f = new FormData(form);
      const read = (n: string) => String(f.get(n) || "");
      const n = (name: string) => (read(name) ? Number(read(name)) : undefined);
      const result = await createListing({
        business_id: businessId || undefined,
        wanted_id: prefill?.id,
        title: read("title"),
        description: read("description"),
        category,
        condition,
        offer_type: offer,
        price_chf: n("price_chf"),
        swap_for: read("swap_for"),
        negotiable: f.has("negotiable"),
        fits,
        fits_note: read("fits_note"),
        manufacturer: read("manufacturer"),
        oem_number: read("oem_number"),
        tire_width: n("tire_width"),
        tire_ratio: n("tire_ratio"),
        rim_diameter: n("rim_diameter"),
        tire_season: ["reifen", "kompletträder"].includes(category)
          ? season
          : undefined,
        tire_dot: read("tire_dot") || undefined,
        tread_mm: n("tread_mm"),
        rim_bolt_pattern: read("rim_bolt_pattern"),
        rim_offset_et: n("rim_offset_et"),
        rim_width: n("rim_width"),
        quantity: n("quantity") || 1,
        photos,
        pickup_zip: read("pickup_zip"),
        pickup_canton: read("pickup_canton"),
        shipping_possible: f.has("shipping_possible"),
        payment_mode: offer === "verkauf" ? payment : null,
        twint_phone:
          offer === "verkauf" && payment === "twint-direct"
            ? read("twint_phone")
            : undefined,
        owner_name: read("owner_name"),
        guest_email: read("guest_email") || undefined,
        ag_hp_field: read("ag_hp_field"),
        captchaToken: await captcha("listing"),
      });
      if (result.ok) setDone(result.data.message);
      else setError(result.error);
    } catch {
      setError(
        "Das Inserat konnte nicht gesendet werden. Bitte erneut versuchen.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="panel">
        <Check size={36} />
        <h2>Fast geschafft.</h2>
        <p>{done}</p>
      </div>
    );
  return (
    <>
      <div className="steps">
        {["Was gibst du ab?", "Dein Angebot", "Fotos & Ort"].map(
          (text, index) => (
            <div key={text} className={index === step ? "active" : ""}>
              <b>{index + 1}</b>
              {text}
            </div>
          ),
        )}
      </div>
      <SafeForm onSubmit={submit}>
        <Honeypot />
        <section hidden={step !== 0}>
          {businesses.length > 0 && (
            <label style={{ marginBottom: 24 }}>
              Inserieren als
              <select
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
              >
                <option value="">Privatperson</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <h2>Was liegt bei dir herum?</h2>
          <p>Wähle die Kategorie, die am besten passt.</p>
          <div className="tile-grid">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`tile ${category === c ? "selected" : ""}`}
              >
                <CategoryIcon category={c} />
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label className="full">
              Titel
              <input
                name="title"
                defaultValue={prefill?.title}
                required={step === 0}
                minLength={2}
                maxLength={120}
                placeholder="z. B. 4 Winterreifen 205/55 R16, guter Zustand"
              />
            </label>
            <label className="full">
              Beschreibung
              <textarea
                name="description"
                maxLength={2000}
                placeholder="Was sollte die nächste Person wissen?"
              />
            </label>
          </div>
          <h2 style={{ marginTop: 28 }}>In welchem Zustand?</h2>
          <div className="tile-grid">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={`tile ${condition === c ? "selected" : ""}`}
                aria-pressed={condition === c}
                onClick={() => setCondition(c)}
              >
                <Check size={20} />
                {CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label>
              Hersteller
              <input
                name="manufacturer"
                maxLength={100}
                placeholder="z. B. Continental"
              />
            </label>
            <label>
              OEM-Teilenummer
              <input
                name="oem_number"
                defaultValue={prefill?.oem_number}
                maxLength={100}
                placeholder="Falls bekannt"
              />
            </label>
          </div>
          {["reifen", "felgen", "kompletträder"].includes(category) && (
            <div className="panel" style={{ marginTop: 24 }}>
              <h2>Reifen- & Felgendaten</h2>
              <div className="form-grid">
                {category !== "felgen" && (
                  <>
                    <label>
                      Breite (mm)
                      <input
                        type="number"
                        name="tire_width"
                        placeholder="205"
                        min="100"
                        max="500"
                      />
                    </label>
                    <label>
                      Querschnitt (%)
                      <input
                        type="number"
                        name="tire_ratio"
                        placeholder="55"
                        min="10"
                        max="100"
                      />
                    </label>
                  </>
                )}
                <label>
                  Durchmesser (Zoll)
                  <input
                    type="number"
                    name="rim_diameter"
                    placeholder="16"
                    min="8"
                    max="30"
                    step=".5"
                  />
                </label>
                <label>
                  Anzahl
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    max="4"
                    defaultValue="4"
                  />
                </label>
                {category !== "felgen" && (
                  <>
                    <label>
                      DOT (Woche/Jahr)
                      <input name="tire_dot" placeholder="2423" maxLength={4} />
                    </label>
                    <label>
                      Profiltiefe (mm)
                      <input
                        name="tread_mm"
                        type="number"
                        min="0"
                        max="20"
                        step=".1"
                      />
                    </label>
                    <div className="full">
                      <label>Saison</label>
                      <div className="tile-grid offer-tiles">
                        {["sommer", "winter", "ganzjahr"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`tile ${season === s ? "selected" : ""}`}
                            onClick={() => setSeason(s)}
                          >
                            {s === "sommer"
                              ? "Sommer"
                              : s === "winter"
                                ? "Winter"
                                : "Ganzjahr"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {category !== "reifen" && (
                  <>
                    <label>
                      Lochkreis
                      <input name="rim_bolt_pattern" placeholder="5x112" />
                    </label>
                    <label>
                      Einpresstiefe (ET)
                      <input
                        name="rim_offset_et"
                        type="number"
                        min="-100"
                        max="150"
                      />
                    </label>
                    <label>
                      Felgenbreite (Zoll)
                      <input name="rim_width" type="number" step=".5" />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
          <h2 style={{ marginTop: 28 }}>Passt zu diesen Fahrzeugen</h2>
          {fits.map((fit, i) => (
            <div key={i} className="fit-row">
              <label>
                Marke
                <input
                  value={fit.make}
                  onChange={(e) =>
                    setFits((p) =>
                      p.map((v, j) =>
                        j === i ? { ...v, make: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Modell
                <input
                  value={fit.model}
                  onChange={(e) =>
                    setFits((p) =>
                      p.map((v, j) =>
                        j === i ? { ...v, model: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Von
                <input
                  type="number"
                  value={fit.year_from}
                  onChange={(e) =>
                    setFits((p) =>
                      p.map((v, j) =>
                        j === i
                          ? { ...v, year_from: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Bis
                <input
                  type="number"
                  value={fit.year_to}
                  onChange={(e) =>
                    setFits((p) =>
                      p.map((v, j) =>
                        j === i ? { ...v, year_to: Number(e.target.value) } : v,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() => setFits((p) => p.filter((_, j) => i !== j))}
              >
                Entfernen
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button"
            disabled={fits.length >= 10}
            onClick={() =>
              setFits((p) => [
                ...p,
                { make: "", model: "", year_from: 2010, year_to: 2020 },
              ])
            }
          >
            <Plus size={16} />
            Weiteres Fahrzeug
          </button>
          <label style={{ marginTop: 18 }}>
            Hinweis zur Kompatibilität
            <input name="fits_note" maxLength={300} />
          </label>
        </section>
        <section hidden={step !== 1}>
          <h2>Wie möchtest du es weitergeben?</h2>
          <div className="tile-grid offer-tiles">
            {OFFERS.map((o, i) => {
              const Icon = [Repeat2, Gift, CreditCard, Banknote][i];
              return (
                <button
                  type="button"
                  key={o}
                  onClick={() => setOffer(o)}
                  aria-pressed={offer === o}
                  className={`tile ${offer === o ? "selected" : ""}`}
                >
                  <Icon />
                  {OFFER_LABELS[o]}
                </button>
              );
            })}
          </div>
          {["verkauf", "verkauf_bar"].includes(offer) && (
            <div className="form-grid">
              <label>
                Preis (CHF)
                <input
                  name="price_chf"
                  type="number"
                  min=".05"
                  step=".05"
                  required={step === 1}
                />
              </label>
              <label className="check">
                <input type="checkbox" name="negotiable" />
                Preis verhandelbar
              </label>
            </div>
          )}
          {offer === "tausch" && (
            <label>
              Was wünschst du dir im Tausch?
              <input name="swap_for" maxLength={120} />
            </label>
          )}
          {offer === "verkauf" && (
            <div className="panel" style={{ marginTop: 24 }}>
              <h2>Zahlungsart</h2>
              <div className="tile-grid offer-tiles">
                <button type="button" className="tile" disabled>
                  <CreditCard />
                  Karte / TWINT über Plattform
                  <span className="hint">Noch nicht freigeschaltet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayment("twint-direct")}
                  className="tile selected"
                >
                  TWINT direkt
                  <span className="hint">Ohne Plattform-Gebühr</span>
                </button>
              </div>
              <label>
                Deine Mobilnummer
                <input
                  name="twint_phone"
                  type="tel"
                  placeholder="+41791234567"
                  required={step === 1}
                />
              </label>
              <p className="hint" style={{ marginTop: 12 }}>
                Deine Nummer bleibt verborgen. Möchte jemand per TWINT zahlen,
                erhältst du eine E-Mail und gibst die Nummer mit einem Klick nur
                für diese Person frei.
              </p>
            </div>
          )}
        </section>
        <section hidden={step !== 2}>
          <h2>Zeig dein Teil von seiner besten Seite.</h2>
          <p>
            Bis zu 5 Fotos. Persönliche Daten und Kontrollschilder bitte
            verdecken.
          </p>
          <div className="photo-upload">
            <Camera size={30} style={{ margin: "auto" }} />
            <label>
              Fotos auswählen
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
                onChange={(e) => upload(e.target.files)}
                disabled={busy}
              />
            </label>
          </div>
          <div className="thumbs">
            {photos.map((p, i) => (
              <div key={p}>
                <img
                  src={p}
                  alt={`Foto ${i + 1}`}
                  style={{ width: 100, height: 80, objectFit: "cover" }}
                />
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setPhotos((v) => v.filter((_, j) => i !== j))}
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
          <div className="form-grid" style={{ marginTop: 28 }}>
            <label>
              Abholort (PLZ)
              <input
                name="pickup_zip"
                value={zip}
                onChange={(event) => {
                  setZip(event.target.value);
                  setCanton("");
                }}
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required={step === 2}
                placeholder="8000"
              />
            </label>
            <label>
              Kanton
              <select
                name="pickup_canton"
                required={step === 2}
                value={canton}
                onChange={(event) => setCanton(event.target.value)}
              >
                <option value="">Bitte wählen</option>
                {(postcode?.cantons || CANTONS).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <p className="full" aria-live="polite">
              {postcode
                ? `${postcode.cities.join(", ")}${postcode.cantons.length > 1 ? " – bitte den Kanton auswählen." : " – Kanton automatisch zugeordnet."}`
                : zip.length === 4
                  ? "Für diese PLZ bitte den Kanton auswählen."
                  : ""}
            </p>
            <label className="check full">
              <input type="checkbox" name="shipping_possible" />
              Versand möglich
            </label>
            <label>
              Dein Name
              <input
                name="owner_name"
                required={step === 2}
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label>
              Deine E-Mail-Adresse
              <input
                name="guest_email"
                type="email"
                required={step === 2}
                autoComplete="email"
              />
            </label>
            <p className="hint full">
              Deine E-Mail-Adresse wird nicht veröffentlicht. Als Gast erhältst
              du einen Bestätigungslink per Mail. Öffentlich erscheint dein
              Vorname mit dem Initial des Nachnamens.
            </p>
          </div>
        </section>
        {error && (
          <div role="alert" className="form-message">
            {error}
          </div>
        )}
        <div className="wizard-nav">
          <button
            type="button"
            className="button"
            disabled={busy || step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Zurück
          </button>
          <button disabled={busy} className="button primary loading-button">
            {busy
              ? "Bitte warten …"
              : step === 2
                ? "Inserat veröffentlichen"
                : "Weiter"}
            {!busy && <ArrowRight size={17} />}
          </button>
        </div>
      </SafeForm>
    </>
  );
}
