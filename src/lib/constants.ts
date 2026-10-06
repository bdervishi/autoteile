export const BRAND_NAME = process.env.BRAND_NAME || "Teilebörse";
export const BRAND_DOMAIN = process.env.BRAND_DOMAIN || "teileboerse.example";
export const CATEGORIES = [
  "reifen",
  "felgen",
  "kompletträder",
  "motor_antrieb",
  "karosserie",
  "beleuchtung",
  "innenraum",
  "elektronik_multimedia",
  "fahrwerk_bremsen",
  "auspuff",
  "dachträger_anhängerkupplung",
  "pflege_werkzeug",
  "kindersitze",
  "zubehör",
  "sonstiges",
] as const;
export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  reifen: "Reifen",
  felgen: "Felgen",
  kompletträder: "Kompletträder",
  motor_antrieb: "Motor & Antrieb",
  karosserie: "Karosserie",
  beleuchtung: "Beleuchtung",
  innenraum: "Innenraum",
  elektronik_multimedia: "Elektronik & Multimedia",
  fahrwerk_bremsen: "Fahrwerk & Bremsen",
  auspuff: "Auspuff",
  dachträger_anhängerkupplung: "Träger & Anhängerkupplung",
  pflege_werkzeug: "Pflege & Werkzeug",
  kindersitze: "Kindersitze",
  zubehör: "Zubehör",
  sonstiges: "Sonstiges",
};
export const CONDITIONS = [
  "neu",
  "neuwertig",
  "gebraucht_gut",
  "gebraucht",
  "defekt_bastler",
] as const;
export const CONDITION_LABELS = {
  neu: "Neu",
  neuwertig: "Neuwertig",
  gebraucht_gut: "Gebraucht · gut",
  gebraucht: "Gebraucht",
  defekt_bastler: "Defekt / Bastler",
};
export const OFFERS = ["tausch", "gratis", "verkauf", "verkauf_bar"] as const;
export const OFFER_LABELS = {
  tausch: "Tauschen",
  gratis: "Verschenken",
  verkauf: "Online verkaufen",
  verkauf_bar: "Bar bei Abholung",
};
export const CANTONS = [
  "AG",
  "AI",
  "AR",
  "BE",
  "BL",
  "BS",
  "FR",
  "GE",
  "GL",
  "GR",
  "JU",
  "LU",
  "NE",
  "NW",
  "OW",
  "SG",
  "SH",
  "SO",
  "SZ",
  "TG",
  "TI",
  "UR",
  "VD",
  "VS",
  "ZG",
  "ZH",
  "FL",
] as const;
export const MAX_PHOTOS = 5;
export const DEFAULT_SETTINGS = {
  guestListingsEnabled: true,
  ratingEnabled: true,
  stripeSaleEnabled: false,
  twintDirectEnabled: true,
  maxPhotosPerListing: 5,
  platformFeePercent: 10,
  guestListingsPerIpPerDay: 3,
  wantedEnabled: true,
};
export const chf = (value: number) =>
  new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 2,
  }).format(value);
export const swissDate = (value: string) =>
  new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
