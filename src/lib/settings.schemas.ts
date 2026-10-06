import { z } from "zod";
export const settingsSchema = z.object({
  guestListingsEnabled: z.boolean(),
  ratingEnabled: z.boolean(),
  stripeSaleEnabled: z.literal(false),
  twintDirectEnabled: z.boolean(),
  maxPhotosPerListing: z.number().int().min(1).max(5),
  platformFeePercent: z.number().min(0).max(30),
  guestListingsPerIpPerDay: z.number().int().min(1).max(20),
  wantedEnabled: z.boolean(),
});
