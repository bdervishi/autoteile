import { z } from "zod";
export const crmContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  company: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  stage: z.enum(["lead", "contacted", "pilot", "customer", "closed"]),
  note: z.string().trim().max(2000),
  nextContact: z.union([
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => {
        const d = new Date(v);
        return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
      }),
    z.literal(""),
  ]),
  id: z.union([z.string().uuid(), z.literal("")]).default(""),
});
export const crmNoteSchema = z.object({
  contactId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});
export const CRM_STAGES: Record<string, string> = {
  lead: "Neuer Kontakt",
  contacted: "In Kontakt",
  pilot: "Pilotpartner",
  customer: "Kunde",
  closed: "Abgeschlossen",
};
