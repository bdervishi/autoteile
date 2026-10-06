import type { PublicItem } from "./listing.types";
import { CONDITIONS } from "./constants";
export function matchesWanted(w: Record<string, any>, i: PublicItem) {
  if (w.category !== i.category) return false;
  if (CONDITIONS.indexOf(i.condition) > CONDITIONS.indexOf(w.min_condition))
    return false;
  if (
    w.oem_number &&
    w.oem_number.trim().toLowerCase() !== i.oem_number.trim().toLowerCase()
  )
    return false;
  if (
    (w.make || w.model || w.year) &&
    !i.fits.some(
      (f) =>
        (!w.make || f.make.toLowerCase() === w.make.toLowerCase()) &&
        (!w.model || f.model.toLowerCase() === w.model.toLowerCase()) &&
        (!w.year || (f.year_from <= w.year && f.year_to >= w.year)),
    )
  )
    return false;
  for (const k of [
    "tire_width",
    "tire_ratio",
    "rim_diameter",
    "tire_season",
  ] as const)
    if (w[k] && w[k] !== i[k]) return false;
  if (
    (w.offer === "tausch" && i.offer_type !== "tausch") ||
    (w.offer === "gratis" && i.offer_type !== "gratis") ||
    (w.offer === "kauf" && !["verkauf", "verkauf_bar"].includes(i.offer_type))
  )
    return false;
  return (
    w.max_price_chf == null ||
    Number(i.price_chf || 0) <= Number(w.max_price_chf)
  );
}
export function autoCheckWanted(text: string) {
  return {
    prohibited:
      /airbag|gurtstraffer|radarwarner|blitzerwarner|seriennummer entfernt/i.test(
        text,
      ),
    contact:
      /\b[^\s@]+@[^\s@]+\.[^\s@]+\b|(?:\+41|0041|\b07[5-9])\s*[\d\s]{7,}/.test(
        text,
      ),
    spam: /https?:\/\/|(.)\1{8,}/i.test(text),
  };
}
