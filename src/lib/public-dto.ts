import type { PublicItem } from "./listing.types";
export const PUBLIC_ITEM_COLUMNS =
  "id,title,description,category,condition,offer_type,price_chf,photos,fits,fits_note,manufacturer,oem_number,pickup_zip,pickup_canton,shipping_possible,negotiable,swap_for,status,created_at,owner_name,owner_type,payment_mode,tire_width,tire_ratio,rim_diameter,tire_season,tread_mm,rim_bolt_pattern,rim_offset_et,quantity,businesses(name,slug)";
export function publicName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)![0]}.` : parts[0];
}
export function publicItemDTO(row: Record<string, any>): PublicItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    offer_type: row.offer_type,
    price_chf: row.price_chf === null ? null : Number(row.price_chf),
    photos: row.photos || [],
    fits: row.fits || [],
    fits_note: row.fits_note || "",
    manufacturer: row.manufacturer || "",
    oem_number: row.oem_number || "",
    pickup_zip: row.pickup_zip,
    pickup_canton: row.pickup_canton,
    shipping_possible: row.shipping_possible,
    negotiable: row.negotiable,
    swap_for: row.swap_for || "",
    status: row.status,
    created_at: row.created_at,
    seller_name:
      row.owner_type === "business"
        ? row.businesses?.name || "Gewerblicher Anbieter"
        : publicName(row.owner_name),
    business_name:
      row.owner_type === "business" ? row.businesses?.name || null : null,
    business_slug: row.businesses?.slug || null,
    payment_mode: row.payment_mode,
    tire_width: row.tire_width ?? null,
    tire_ratio: row.tire_ratio ?? null,
    rim_diameter: row.rim_diameter ?? null,
    tire_season: row.tire_season ?? null,
    tread_mm: row.tread_mm ?? null,
    rim_bolt_pattern: row.rim_bolt_pattern ?? null,
    rim_offset_et: row.rim_offset_et ?? null,
    quantity: row.quantity || 1,
  };
}
