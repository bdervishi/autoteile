import Link from "next/link";
import { Search, Plus, LayoutGrid, ListFilter } from "lucide-react";
import { listItems } from "@/lib/server/catalog";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  OFFERS,
  OFFER_LABELS,
  CANTONS,
} from "@/lib/constants";
import type { PublicItem } from "@/lib/listing.types";
import { WantedCards } from "@/components/wanted-cards";
import { ItemCard } from "@/components/item-card";
export const dynamic = "force-dynamic";
export const metadata = { title: "Autoteile finden" };
export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const result = await listItems(params);
  const wanted = params.ansicht === "gesuche";
  const nextParams = new URLSearchParams(
    Object.entries(params).filter(
      (v): v is [string, string] => typeof v[1] === "string",
    ),
  );
  if (result.cursor) nextParams.set("cursor", result.cursor);
  return (
    <main id="main" className="container">
      <div className="eyebrow">Die Teilebörse für die Schweiz</div>
      <div className="market-top">
        <div>
          <h1>Das passende Teil. Ganz in der Nähe.</h1>
          <p>
            Tauschen, verschenken oder verkaufen. Von privat und von der Garage.
          </p>
        </div>
        <Link href="/teile/neu" className="button primary">
          <Plus size={18} />
          Inserat aufgeben
        </Link>
      </div>
      {result.demo && (
        <div className="demo-note">
          Lokale Vorschau mit Beispielangeboten. Noch keine echten Inserate oder
          Zahlungen.
        </div>
      )}
      <div className="tabs">
        <Link className={`tab ${!wanted ? "active" : ""}`} href="/teile">
          <LayoutGrid size={19} />
          Angebote {!wanted && <small>{result.items.length}</small>}
        </Link>
        <Link
          className={`tab ${wanted ? "active" : ""}`}
          href="/teile?ansicht=gesuche"
        >
          <Search size={19} />
          Gesuche
        </Link>
      </div>
      {wanted ? (
        <WantedCards />
      ) : (
        <>
          <form action="/teile" className="searchbar">
            <label className="sr-only" htmlFor="q">
              Teile, Fahrzeug oder Teilenummer suchen
            </label>
            <Search size={21} />
            <input
              id="q"
              name="q"
              defaultValue={params.q}
              placeholder="Teil, Fahrzeug oder OEM-Nummer suchen …"
            />
            <button className="button dark-button">Suchen</button>
          </form>
          <div className="market-layout">
            <form action="/teile" className="filters">
              <h3>
                <ListFilter
                  size={17}
                  style={{ display: "inline", marginRight: 8 }}
                />
                Suche eingrenzen
              </h3>
              {params.q && <input type="hidden" name="q" value={params.q} />}
              <label>
                Kategorie
                <select name="category" defaultValue={params.category || ""}>
                  <option value="">Alle Kategorien</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Kanton
                <select name="canton" defaultValue={params.canton || ""}>
                  <option value="">Ganze Schweiz</option>
                  {CANTONS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <details open={!!(params.make || params.model || params.year)}>
                <summary>Fahrzeug</summary>
                <label>
                  Marke
                  <input
                    name="make"
                    placeholder="z. B. Volkswagen"
                    defaultValue={params.make}
                  />
                </label>
                <label>
                  Modell
                  <input
                    name="model"
                    placeholder="z. B. Golf 7"
                    defaultValue={params.model}
                  />
                </label>
                <label>
                  Baujahr
                  <input
                    name="year"
                    type="number"
                    min="1900"
                    max="2100"
                    defaultValue={params.year}
                  />
                </label>
              </details>
              <details open={!!(params.width || params.bolt)}>
                <summary>Reifen & Felgen</summary>
                <label>
                  Breite
                  <input
                    name="width"
                    type="number"
                    placeholder="205"
                    defaultValue={params.width}
                  />
                </label>
                <label>
                  Querschnitt
                  <input
                    name="ratio"
                    type="number"
                    placeholder="55"
                    defaultValue={params.ratio}
                  />
                </label>
                <label>
                  Durchmesser (Zoll)
                  <input
                    name="diameter"
                    type="number"
                    placeholder="16"
                    defaultValue={params.diameter}
                  />
                </label>
                <label>
                  Saison
                  <select name="season" defaultValue={params.season || ""}>
                    <option value="">Alle</option>
                    <option value="sommer">Sommer</option>
                    <option value="winter">Winter</option>
                    <option value="ganzjahr">Ganzjahr</option>
                  </select>
                </label>
                <label>
                  Lochkreis
                  <input
                    name="bolt"
                    placeholder="5x112"
                    defaultValue={params.bolt}
                  />
                </label>
              </details>
              <details
                open={
                  !!(
                    params.condition ||
                    params.offer ||
                    params.min ||
                    params.max
                  )
                }
              >
                <summary>Zustand & Angebot</summary>
                <label>
                  Zustand
                  <select
                    name="condition"
                    defaultValue={params.condition || ""}
                  >
                    <option value="">Alle Zustände</option>
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {CONDITION_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Angebotsart
                  <select name="offer" defaultValue={params.offer || ""}>
                    <option value="">Alle Angebote</option>
                    {OFFERS.map((c) => (
                      <option key={c} value={c}>
                        {OFFER_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="price-fields">
                  <label>
                    CHF von
                    <input
                      name="min"
                      type="number"
                      min="0"
                      defaultValue={params.min}
                    />
                  </label>
                  <label>
                    CHF bis
                    <input
                      name="max"
                      type="number"
                      min="0"
                      defaultValue={params.max}
                    />
                  </label>
                </div>
              </details>
              <details>
                <summary>Ort & Anbieter</summary>
                <label>
                  PLZ
                  <input
                    name="zip"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    defaultValue={params.zip}
                  />
                </label>
                <label>
                  Anbieter
                  <select name="seller" defaultValue={params.seller || ""}>
                    <option value="">Alle Anbieter</option>
                    <option value="private">Private</option>
                    <option value="business">Gewerbliche</option>
                  </select>
                </label>
              </details>
              <label className="check">
                <input
                  name="shipping"
                  type="checkbox"
                  value="1"
                  defaultChecked={params.shipping === "1"}
                />
                Versand möglich
              </label>
              <button className="button primary">Filter anwenden</button>
              <Link href="/teile" className="text-link">
                Filter zurücksetzen
              </Link>
            </form>
            <section aria-label="Suchergebnisse">
              <div className="results-top">
                <span>
                  {result.items.length} Angebote
                  {result.demo ? " in der Vorschau" : ""}
                </span>
                <span>Neueste zuerst</span>
              </div>
              {result.error ? (
                <div role="alert" className="form-message">
                  {result.error}
                </div>
              ) : result.items.length ? (
                <div className="grid">
                  {result.items.map((item: PublicItem) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <h2>Hier ist noch Platz.</h2>
                  <p>
                    Keine passenden Angebote gefunden. Passe die Filter an oder
                    gib ein Gesuch auf.
                  </p>
                  <Link href="/teile/gesuch/neu" className="button">
                    Gesuch aufgeben
                  </Link>
                </div>
              )}
              {result.cursor && (
                <div className="pagination">
                  <Link href={`/teile?${nextParams}`} className="button">
                    Weitere Angebote
                  </Link>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
