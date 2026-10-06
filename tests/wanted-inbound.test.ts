import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { inboundText, inboundSender, verifyPostal } from "@/lib/server/inbound";
import { autoCheckWanted, matchesWanted } from "@/lib/wanted";
import { DEMO_ITEMS } from "@/lib/demo";
import { verifyCaptcha } from "@/lib/server/guard";
describe("Wanted matching", () => {
  const wanted = {
    category: "reifen",
    min_condition: "gebraucht",
    make: "Volkswagen",
    model: "Golf 7",
    year: 2016,
    offer: "kauf",
    max_price_chf: 200,
    tire_width: 205,
    tire_ratio: 55,
    rim_diameter: 16,
  };
  it("matches all conditions and rejects an expensive, wrong-year or worn part", () => {
    expect(matchesWanted(wanted, DEMO_ITEMS[0])).toBe(true);
    expect(matchesWanted({ ...wanted, year: 2000 }, DEMO_ITEMS[0])).toBe(false);
    expect(
      matchesWanted({ ...wanted, max_price_chf: 100 }, DEMO_ITEMS[0]),
    ).toBe(false);
    expect(
      matchesWanted({ ...wanted, min_condition: "neu" }, DEMO_ITEMS[0]),
    ).toBe(false);
    expect(matchesWanted({ ...wanted, offer: "gratis" }, DEMO_ITEMS[0])).toBe(
      false,
    );
  });
  it("flags prohibited terms, contacts and spam", () => {
    expect(autoCheckWanted("Airbag +41791234567 https://spam.ch")).toEqual({
      prohibited: true,
      contact: true,
      spam: true,
    });
  });
});
describe("Inbound mail", () => {
  const base = {
    id: 1,
    rcpt_to: "test@example.ch",
    mail_from: "m@example.ch",
    from: "Marco <m@example.ch>",
    plain_body: "Hallo\n> quoted\n-- \nSignatur",
    spam_status: "NotSpam",
    bounce: false,
  };
  it("cleans plain replies, rejects bounces, spam and auto-replies", () => {
    expect(inboundText(base)).toBe("Hallo");
    expect(inboundText({ ...base, bounce: true })).toBeNull();
    expect(inboundText({ ...base, spam_status: "Spam" })).toBeNull();
    expect(inboundText({ ...base, auto_submitted: "auto-replied" })).toBeNull();
    expect(inboundText({ ...base, auto_submitted: "no" })).toBe("Hallo");
    expect(inboundSender("Marco <m@example.ch>")).toBe("m@example.ch");
    expect(inboundSender("m@example.ch\r\nBcc: x@example.ch")).toBeNull();
  });
  it("verifies Postal RSA-SHA256 against configured JWKS and rejects tampering", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const jwk = publicKey.export({ format: "jwk" });
    process.env.POSTAL_JWKS_URL =
      "https://postal.example.ch/.well-known/jwks.json";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [{ ...jwk, kid: "test" }] }),
      }),
    );
    const raw = JSON.stringify(base);
    const signature = sign("RSA-SHA256", Buffer.from(raw), privateKey).toString(
      "base64",
    );
    expect(await verifyPostal(raw, signature, "test")).toBe(true);
    expect(await verifyPostal(raw + " ", signature, "test")).toBe(false);
    expect(await verifyPostal(raw, signature, "unknown")).toBe(false);
    expect(await verifyPostal(raw, null, "test")).toBe(false);
    vi.unstubAllGlobals();
  });
});
describe("Captcha fail closed", () => {
  beforeEach(() => {
    process.env.RECAPTCHA_SECRET_KEY = "test";
    process.env.RECAPTCHA_HOSTNAME = "example.ch";
  });
  it("rejects network failure, low score, different action and host", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await verifyCaptcha("token", "inquiry")).toBe(false);
    for (const data of [
      { success: true, score: 0.4, action: "inquiry", hostname: "example.ch" },
      { success: true, score: 0.9, action: "listing", hostname: "example.ch" },
      { success: true, score: 0.9, action: "inquiry", hostname: "evil.ch" },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            ...data,
            challenge_ts: new Date().toISOString(),
          }),
        }),
      );
      expect(await verifyCaptcha("token", "inquiry")).toBe(false);
    }
    vi.unstubAllGlobals();
  });
  it("accepts only a recent successful challenge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          score: 0.9,
          action: "inquiry",
          hostname: "example.ch",
          challenge_ts: new Date().toISOString(),
        }),
      }),
    );
    expect(await verifyCaptcha("token", "inquiry")).toBe(true);
    vi.unstubAllGlobals();
  });
});
