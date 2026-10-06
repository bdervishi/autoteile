import { describe, it, expect } from "vitest";
import { postcodeInfo } from "../src/lib/postcodes";
describe("official postcode data", () => {
  it("maps an unambiguous Swiss locality", () =>
    expect(postcodeInfo("6003")?.cantons).toEqual(["LU"]));
  it("preserves cross-canton choices", () =>
    expect(postcodeInfo("8866")?.cantons.sort()).toEqual(["GL", "SG"]));
  it("maps Liechtenstein municipalities to FL", () =>
    expect(postcodeInfo("9490")?.cantons).toEqual(["FL"]));
  it("does not invent administrative postcode mappings", () =>
    expect(postcodeInfo("8000")).toBeNull());
});
