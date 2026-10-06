import { z } from "zod";
export const COMMERCIAL_OFFERS = {
  starter: { name: "Händler Starter", price: 39, unit: "Monat", limit: 30 },
  pro: { name: "Händler Pro", price: 79, unit: "Monat", limit: 150 },
  plus: { name: "Händler Plus", price: 149, unit: "Monat", limit: 500 },
  boost: { name: "Inserat-Boost", price: 5.9, unit: "7 Tage", limit: 0 },
  sponsor: {
    name: "Regionaler Sponsor",
    price: 150,
    unit: "Monat, ab",
    limit: 0,
  },
  montage: {
    name: "Montagepartner",
    price: 0,
    unit: "nach Vereinbarung",
    limit: 0,
  },
  affiliate: {
    name: "Zubehörpartner",
    price: 0,
    unit: "nach Vereinbarung",
    limit: 0,
  },
} as const;
export const commercialRequestSchema = z.object({
  offer: z.enum([
    "starter",
    "pro",
    "plus",
    "boost",
    "sponsor",
    "montage",
    "affiliate",
  ]),
  name: z.string().trim().min(2).max(120),
  note: z.string().trim().max(1000),
  itemId: z.union([z.string().uuid(), z.literal("")]).default(""),
  captchaToken: z.string().max(4000),
  ag_hp_field: z.string().max(200),
});
export const commercialDecisionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["contacted", "accepted", "declined"]),
  note: z.string().trim().min(1).max(1000),
});
