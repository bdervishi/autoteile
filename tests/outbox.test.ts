import { it, expect } from "vitest";
import { sealOutbox, openOutbox } from "@/lib/server/outbox-crypto";
it("encrypts access links at rest and rejects tampering", () => {
  process.env.TOKEN_SECRET =
    "long-and-random-test-secret-with-at-least-thirty-two-characters";
  const body = "Open https://example.ch/teile/meine/private-token";
  const encrypted = sealOutbox(body);
  expect(encrypted).not.toContain("private-token");
  expect(openOutbox(encrypted)).toBe(body);
  const parts = encrypted.split(":");
  parts[3] = Buffer.alloc(16).toString("base64url");
  expect(() => openOutbox(parts.join(":"))).toThrow();
});
