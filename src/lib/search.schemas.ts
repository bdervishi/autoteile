import { z } from "zod";
import { CATEGORIES, CONDITIONS, OFFERS, CANTONS } from "./constants";
const num = z.coerce.number().nonnegative().optional();
export const searchSchema = z.object({
  q: z.string().max(120).optional(),
  category: z.enum(CATEGORIES).optional(),
  condition: z.enum(CONDITIONS).optional(),
  offer: z.enum(OFFERS).optional(),
  canton: z.enum(CANTONS).optional(),
  zip: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  make: z.string().max(60).optional(),
  model: z.string().max(80).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  min: num,
  max: num,
  width: num,
  ratio: num,
  diameter: num,
  season: z.enum(["sommer", "winter", "ganzjahr"]).optional(),
  bolt: z.string().max(20).optional(),
  shipping: z.literal("1").optional(),
  seller: z.enum(["private", "business"]).optional(),
  cursor: z.string().max(300).optional(),
  ansicht: z.enum(["angebote", "gesuche"]).optional(),
});
export type SearchFilters = z.infer<typeof searchSchema>;
