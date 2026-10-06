import { describe, it, expect } from "vitest";
import {
  COMMERCIAL_OFFERS,
  commercialRequestSchema,
  commercialDecisionSchema,
} from "@/lib/monetization";
describe("commercial offers", () => {
  it("keeps quoted prices server owned and validates requests", () => {
    const result = commercialRequestSchema.parse({
      offer: "pro",
      name: "Garage Muster",
      note: "",
      captchaToken: "token",
      ag_hp_field: "",
      price: 0,
      status: "accepted",
    });
    expect(result).not.toHaveProperty("price");
    expect(result).not.toHaveProperty("status");
    expect(COMMERCIAL_OFFERS.pro.price).toBe(79);
    expect(
      commercialRequestSchema.safeParse({ ...result, offer: "admin" }).success,
    ).toBe(false);
  });
  it("requires an audit reason and restricts decisions", () => {
    expect(
      commercialDecisionSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        status: "accepted",
        note: " ",
      }).success,
    ).toBe(false);
    expect(
      commercialDecisionSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        status: "paid",
        note: "Test",
      }).success,
    ).toBe(false);
  });
});
