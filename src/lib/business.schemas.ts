import { z } from "zod";
import { plain } from "./listing.schemas";
import { CANTONS } from "./constants";
export const businessSchema = z.object({
  name: plain(2, 120),
  uid_number: z.string().regex(/^CHE-\d{3}\.\d{3}\.\d{3}$/),
  address: plain(2, 200),
  zip: z.string().regex(/^\d{4}$/),
  city: plain(2, 100),
  canton: z.enum(CANTONS),
  website: z
    .string()
    .url()
    .refine((v) => new URL(v).protocol === "https:")
    .optional(),
  logo_url: z.string().url().optional(),
});
