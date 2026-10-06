import { z } from "zod";
import { CATEGORIES, CONDITIONS, OFFERS, CANTONS } from "./constants";
import { toPlainText } from "./plain-text";
export const plain = (min: number, max: number) =>
  z.preprocess(toPlainText, z.string().min(min).max(max));
export const emailSchema = z
  .string()
  .email()
  .max(254)
  .refine((v) => !/[\r\n]/.test(v), "Ungültige E-Mail-Adresse.")
  .transform((v) => v.trim().toLowerCase());
const number = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().nonnegative().optional(),
);
export const listingSchema = z
  .object({
    business_id: z.string().uuid().optional(),
    wanted_id: z.string().uuid().optional(),
    title: plain(2, 120),
    description: plain(0, 2000),
    category: z.enum(CATEGORIES),
    condition: z.enum(CONDITIONS),
    fits: z
      .array(
        z
          .object({
            make: plain(1, 60),
            model: plain(1, 80),
            year_from: z.number().int().min(1900).max(2100),
            year_to: z.number().int().min(1900).max(2100),
            engine: plain(0, 80).optional(),
          })
          .refine((v) => v.year_to >= v.year_from),
      )
      .max(10)
      .default([]),
    fits_note: plain(0, 300).default(""),
    oem_number: plain(0, 100).default(""),
    manufacturer: plain(0, 100).default(""),
    tire_width: number,
    tire_ratio: number,
    rim_diameter: number,
    tire_season: z.enum(["sommer", "winter", "ganzjahr"]).optional(),
    tire_dot: z
      .string()
      .regex(/^(0[1-9]|[1-4][0-9]|5[0-3])\d{2}$/)
      .optional(),
    tread_mm: number,
    rim_bolt_pattern: plain(0, 20).default(""),
    rim_offset_et: z.number().min(-100).max(150).optional(),
    rim_width: number,
    quantity: z.number().int().min(1).max(4).default(1),
    photos: z.array(z.string().url()).max(5).default([]),
    offer_type: z.enum(OFFERS),
    price_chf: number,
    swap_for: plain(0, 120).default(""),
    negotiable: z.boolean().default(false),
    shipping_possible: z.boolean().default(false),
    pickup_zip: z.string().regex(/^\d{4}$/),
    pickup_canton: z.enum(CANTONS),
    payment_mode: z.enum(["stripe", "twint-direct"]).nullable().default(null),
    twint_phone: z
      .string()
      .regex(/^\+41[0-9]{9}$/)
      .optional(),
    owner_name: plain(2, 100),
    guest_email: emailSchema.optional(),
    captchaToken: z.string().max(4096).optional(),
    ag_hp_field: z.string().max(500).default(""),
  })
  .superRefine((v, c) => {
    if (
      ["verkauf", "verkauf_bar"].includes(v.offer_type) &&
      !(v.price_chf && v.price_chf > 0)
    )
      c.addIssue({
        code: "custom",
        path: ["price_chf"],
        message: "Bitte einen Preis angeben.",
      });
    if (v.offer_type === "verkauf" && !v.payment_mode)
      c.addIssue({
        code: "custom",
        path: ["payment_mode"],
        message: "Bitte eine Zahlungsart wählen.",
      });
    if (v.payment_mode === "twint-direct" && !v.twint_phone)
      c.addIssue({
        code: "custom",
        path: ["twint_phone"],
        message: "Bitte eine gültige Schweizer Mobilnummer angeben.",
      });
  });
export const inquirySchema = z.object({
  item_id: z.string().uuid(),
  requester_name: plain(2, 100),
  requester_email: emailSchema,
  message: plain(2, 2000),
  offer_back: plain(0, 120).default(""),
  twint_requested: z.boolean().default(false),
  captchaToken: z.string().max(4096),
  ag_hp_field: z.string().max(500).default(""),
});
export const wantedSchema = z.object({
  group_title: plain(2, 120),
  owner_name: plain(2, 100),
  guest_email: emailSchema,
  note: plain(0, 200),
  pickup_zip: z.string().regex(/^\d{4}$/),
  articles: z
    .array(
      z.object({
        category: z.enum(CATEGORIES),
        make: plain(0, 60),
        model: plain(0, 80),
        oem_number: plain(0, 100),
        min_condition: z.enum(CONDITIONS),
        offer: z.enum(["tausch", "gratis", "kauf"]),
        max_price_chf: number,
      }),
    )
    .min(1)
    .max(5),
  captchaToken: z.string(),
  ag_hp_field: z.string().default(""),
});
