import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
import { chf, CONDITION_LABELS } from "@/lib/constants";
import type { PublicItem } from "@/lib/listing.types";
import { CategoryIcon } from "./icons";
export function ItemCard({ item }: { item: PublicItem }) {
  const tag =
    item.offer_type === "gratis"
      ? "Gratis"
      : item.offer_type === "tausch"
        ? "Tausch"
        : CONDITION_LABELS[item.condition];
  return (
    <Link className="card" href={`/teile/${item.id}`}>
      <div className="product-photo">
        {item.photos[0] ? (
          <img src={item.photos[0]} alt={item.title} loading="lazy" />
        ) : (
          <CategoryIcon category={item.category} size={76} />
        )}
        <span
          className={`photo-tag ${item.offer_type === "gratis" ? "free" : item.offer_type === "tausch" ? "swap" : ""}`}
        >
          {tag}
        </span>
      </div>
      <div className="card-body">
        <h3>{item.title}</h3>
        <p className="fit">
          {item.fits[0]
            ? `${item.fits[0].make} ${item.fits[0].model} · ${item.fits[0].year_from}–${item.fits[0].year_to}`
            : "Fahrzeugunabhängig"}
        </p>
        <div className="price">
          {item.offer_type === "gratis"
            ? "Zu verschenken"
            : item.offer_type === "tausch"
              ? "Zum Tauschen"
              : chf(item.price_chf || 0)}
        </div>
        <div className="card-meta">
          <span>
            <MapPin size={12} style={{ display: "inline" }} /> {item.pickup_zip}{" "}
            · {item.pickup_canton}
          </span>
          {item.business_name ? (
            <span className="business-badge">
              <ShieldCheck size={11} />
              Gewerblich
            </span>
          ) : (
            <span>
              {item.shipping_possible ? "Versand möglich" : "Abholung"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
