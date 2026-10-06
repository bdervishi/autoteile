import { RatingSummary } from "@/components/rating-summary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Truck, ShieldCheck } from "lucide-react";
import { getItem } from "@/lib/server/catalog";
import { databaseConfigured } from "@/lib/server/db";
import {
  chf,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  BRAND_NAME,
} from "@/lib/constants";
import { Gallery } from "@/components/gallery";
import { InquiryForm } from "@/components/inquiry-form";
import { ReportForm } from "@/components/report-form";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  return {
    title: item
      ? `${item.title} · ${item.price_chf ? chf(item.price_chf) : item.offer_type === "gratis" ? "Gratis" : "Tausch"}`
      : "Inserat nicht gefunden",
    description: item?.description.slice(0, 160),
    robots: { index: databaseConfigured(), follow: true },
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    description: item.description,
    image: item.photos,
    brand: { "@type": "Brand", name: item.manufacturer || BRAND_NAME },
    ...(item.price_chf !== null && item.offer_type !== "tausch"
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "CHF",
            price: item.price_chf,
            availability:
              item.status === "available"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };
  return (
    <main id="main" className="container detail">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <div className="breadcrumbs">
        <Link href="/teile">Marktplatz</Link>
        <span>/</span>
        <Link href={`/teile?category=${item.category}`}>
          {CATEGORY_LABELS[item.category]}
        </Link>
      </div>
      {!databaseConfigured() && (
        <div className="demo-note">
          Beispielinserat · Dies ist kein echtes Angebot.
        </div>
      )}
      <div className="detail-layout">
        <div>
          <Gallery item={item} />
          <section style={{ marginTop: 30 }}>
            <h2>Zum Teil</h2>
            <p style={{ whiteSpace: "pre-line" }}>{item.description}</p>
            {item.fits.length > 0 && (
              <>
                <h3>Passende Fahrzeuge</h3>
                {item.fits.map((fit, i) => (
                  <p key={i}>
                    {fit.make} {fit.model} · {fit.year_from}–{fit.year_to}
                    {fit.engine ? ` · ${fit.engine}` : ""}
                  </p>
                ))}
              </>
            )}
            <p className="hint">{item.fits_note}</p>
          </section>
          <ReportForm id={item.id} />
        </div>
        <div>
          <div className="eyebrow">
            {CATEGORY_LABELS[item.category]} ·{" "}
            {CONDITION_LABELS[item.condition]}
          </div>
          <h1 style={{ marginTop: 12 }}>{item.title}</h1>
          <div className="price">
            {item.offer_type === "gratis"
              ? "Gratis"
              : item.offer_type === "tausch"
                ? "Zum Tauschen"
                : chf(item.price_chf || 0)}{" "}
            {item.negotiable && item.price_chf ? (
              <span className="hint">verhandelbar</span>
            ) : null}
          </div>
          {item.swap_for && <p>Tauschwunsch: {item.swap_for}</p>}
          <dl className="specs">
            <div>
              <dt>Abholort</dt>
              <dd>
                <MapPin size={14} style={{ display: "inline" }} />{" "}
                {item.pickup_zip} · {item.pickup_canton}
              </dd>
            </div>
            <div>
              <dt>Versand</dt>
              <dd>{item.shipping_possible ? "Möglich" : "Nur Abholung"}</dd>
            </div>
            <div>
              <dt>Hersteller</dt>
              <dd>{item.manufacturer || "Keine Angabe"}</dd>
            </div>
            <div>
              <dt>OEM-Nummer</dt>
              <dd>{item.oem_number || "Keine Angabe"}</dd>
            </div>
            {item.tire_width && (
              <div>
                <dt>Reifengrösse</dt>
                <dd>
                  {item.tire_width}/{item.tire_ratio} R{item.rim_diameter}
                </dd>
              </div>
            )}
            {item.tread_mm && (
              <div>
                <dt>Profiltiefe</dt>
                <dd>{item.tread_mm} mm</dd>
              </div>
            )}
            {item.rim_bolt_pattern && (
              <div>
                <dt>Lochkreis</dt>
                <dd>{item.rim_bolt_pattern}</dd>
              </div>
            )}
            {item.tire_season && (
              <div>
                <dt>Saison</dt>
                <dd>
                  {item.tire_season === "winter"
                    ? "Winter"
                    : item.tire_season === "sommer"
                      ? "Sommer"
                      : "Ganzjahr"}
                </dd>
              </div>
            )}
          </dl>
          <div className="panel">
            <h3>{item.seller_name}</h3>
            <RatingSummary itemId={item.id} />
            {item.business_name ? (
              <span className="business-badge">
                <ShieldCheck size={13} />
                Gewerblicher Anbieter
              </span>
            ) : (
              <p className="hint">
                Privater Anbieter · E-Mail-Adresse bleibt verborgen
              </p>
            )}
          </div>
          {item.status === "reserved" && (
            <div className="form-message">
              Dieses Teil ist derzeit reserviert.
            </div>
          )}
          <InquiryForm item={item} />
        </div>
      </div>
    </main>
  );
}
