import { it, expect } from "vitest";
import { crmContactSchema } from "@/lib/crm.schemas";
it("rejects invalid CRM stages and impossible follow-up dates", () => {
  const contact = {
    name: "Garage",
    email: "info@example.test",
    company: "",
    phone: "",
    stage: "lead",
    note: "",
    nextContact: "2026-02-30",
  };
  expect(crmContactSchema.safeParse(contact).success).toBe(false);
  expect(
    crmContactSchema.safeParse({ ...contact, nextContact: "2026-02-28" })
      .success,
  ).toBe(true);
  expect(
    crmContactSchema.safeParse({ ...contact, nextContact: "", stage: "admin" })
      .success,
  ).toBe(false);
});
