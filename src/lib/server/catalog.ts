import "server-only";
import { db, databaseConfigured } from "./db";
import { DEMO_ITEMS } from "../demo";
import { publicItemDTO, PUBLIC_ITEM_COLUMNS } from "../public-dto";
import { searchSchema, type SearchFilters } from "../search.schemas";
import type { PublicItem } from "../listing.types";
const encodeCursor = (item: PublicItem) =>
  Buffer.from(JSON.stringify({ date: item.created_at, id: item.id })).toString(
    "base64url",
  );
function decodeCursor(value?: string): { date: string; id: string } | null {
  try {
    if (!value) return null;
    const data = JSON.parse(Buffer.from(value, "base64url").toString());
    if (
      !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(data.date) ||
      !/^[a-f0-9-]{36}$/.test(data.id)
    )
      return null;
    return data;
  } catch {
    return null;
  }
}
export function filterDemo(items: PublicItem[], f: SearchFilters) {
  return items.filter(
    (i) =>
      (!f.q ||
        `${i.title} ${i.description} ${i.oem_number} ${i.fits.map((f) => `${f.make} ${f.model}`).join(" ")}`
          .toLowerCase()
          .includes(f.q.toLowerCase())) &&
      (!f.category || i.category === f.category) &&
      (!f.condition || i.condition === f.condition) &&
      (!f.offer || i.offer_type === f.offer) &&
      (!f.canton || i.pickup_canton === f.canton) &&
      (!f.zip || i.pickup_zip === f.zip) &&
      (!f.shipping || i.shipping_possible) &&
      (!f.seller ||
        (f.seller === "business" ? !!i.business_name : !i.business_name)) &&
      (f.min === undefined || (i.price_chf ?? 0) >= f.min) &&
      (f.max === undefined || (i.price_chf ?? 0) <= f.max) &&
      (!f.width || i.tire_width === f.width) &&
      (!f.ratio || i.tire_ratio === f.ratio) &&
      (!f.diameter || i.rim_diameter === f.diameter) &&
      (!f.season || i.tire_season === f.season) &&
      (!f.bolt || i.rim_bolt_pattern === f.bolt) &&
      ((!f.make && !f.model && !f.year) ||
        i.fits.some(
          (v) =>
            (!f.make || v.make.toLowerCase() === f.make.toLowerCase()) &&
            (!f.model || v.model.toLowerCase() === f.model.toLowerCase()) &&
            (!f.year || (v.year_from <= f.year && v.year_to >= f.year)),
        )),
  );
}
export async function listItems(raw: Record<string, string | undefined>) {
  const parsed = searchSchema.safeParse(
    Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== "" && v !== undefined),
    ),
  );
  if (!parsed.success)
    return {
      items: [] as PublicItem[],
      demo: !databaseConfigured(),
      cursor: null,
      error: "Bitte die Suchfilter prüfen.",
    };
  const f = parsed.data;
  if (!databaseConfigured())
    return {
      items: filterDemo(DEMO_ITEMS, f),
      demo: true,
      cursor: null,
      error: null,
    };
  let query = db()
    .from("parts_items")
    .select(PUBLIC_ITEM_COLUMNS)
    .in("status", ["available", "reserved"])
    .is("moderation_hidden_at", null)
    .not("email_confirmed_at", "is", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(25);
  if (f.q)
    query = query.textSearch("search_tsv", f.q, {
      type: "websearch",
      config: "german",
    });
  if (f.category) query = query.eq("category", f.category);
  if (f.condition) query = query.eq("condition", f.condition);
  if (f.offer) query = query.eq("offer_type", f.offer);
  if (f.canton) query = query.eq("pickup_canton", f.canton);
  if (f.zip) query = query.eq("pickup_zip", f.zip);
  if (f.shipping) query = query.eq("shipping_possible", true);
  if (f.seller)
    query =
      f.seller === "business"
        ? query.eq("owner_type", "business")
        : query.in("owner_type", ["private", "guest"]);
  if (f.min !== undefined) query = query.gte("price_chf", f.min);
  if (f.max !== undefined) query = query.lte("price_chf", f.max);
  if (f.width) query = query.eq("tire_width", f.width);
  if (f.ratio) query = query.eq("tire_ratio", f.ratio);
  if (f.diameter) query = query.eq("rim_diameter", f.diameter);
  if (f.season) query = query.eq("tire_season", f.season);
  if (f.bolt) query = query.eq("rim_bolt_pattern", f.bolt);
  // Vehicle/year filtering is performed in SQL via an RPC, before limiting.
  if (f.make || f.model || f.year) {
    const { data, error } = await db().rpc("search_public_items", {
      p_filters: f,
      p_cursor: decodeCursor(f.cursor),
    });
    if (error) {
      console.error("catalog search failed", error.code);
      return {
        items: [],
        demo: false,
        cursor: null,
        error: "Die Angebote konnten nicht geladen werden.",
      };
    }
    const rows = (data || []).map(publicItemDTO);
    return {
      items: rows.slice(0, 24),
      demo: false,
      cursor: rows.length > 24 ? encodeCursor(rows[23]) : null,
      error: null,
    };
  }
  const cursor = decodeCursor(f.cursor);
  if (f.cursor && !cursor)
    return {
      items: [],
      demo: false,
      cursor: null,
      error: "Der Seitenlink ist ungültig.",
    };
  if (cursor)
    query = query.or(
      `created_at.lt.${cursor.date},and(created_at.eq.${cursor.date},id.lt.${cursor.id})`,
    );
  const { data, error } = await query;
  if (error) {
    console.error("catalog load failed", error.code);
    return {
      items: [],
      demo: false,
      cursor: null,
      error: "Die Angebote konnten nicht geladen werden.",
    };
  }
  const items = (data || []).map(publicItemDTO);
  return {
    items: items.slice(0, 24),
    demo: false,
    cursor: items.length > 24 ? encodeCursor(items[23]) : null,
    error: null,
  };
}
export async function getItem(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  if (!databaseConfigured()) return DEMO_ITEMS.find((i) => i.id === id) || null;
  const { data } = await db()
    .from("parts_items")
    .select(PUBLIC_ITEM_COLUMNS)
    .eq("id", id)
    .in("status", ["available", "reserved"])
    .is("moderation_hidden_at", null)
    .not("email_confirmed_at", "is", null)
    .maybeSingle();
  return data ? publicItemDTO(data) : null;
}
