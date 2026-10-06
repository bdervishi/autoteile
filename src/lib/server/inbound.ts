import "server-only";
import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import { emailSchema } from "../listing.schemas";
import { stripEmailReply } from "../plain-text";
export const inboundSchema = z.object({
  id: z.union([z.string().max(100), z.number()]),
  rcpt_to: z.string().max(300),
  mail_from: z.string().max(300),
  from: z.string().max(300),
  plain_body: z.string().max(100000).nullable().optional(),
  spam_status: z.string(),
  bounce: z.boolean(),
  auto_submitted: z.string().nullable().optional(),
});
export function inboundSender(value: string) {
  const match = value.match(/^[^<>]*<([^<>]+)>$/);
  const parsed = emailSchema.safeParse(match ? match[1] : value);
  return parsed.success ? parsed.data : null;
}
export function inboundText(payload: z.infer<typeof inboundSchema>) {
  if (
    payload.bounce ||
    payload.spam_status !== "NotSpam" ||
    (payload.auto_submitted && payload.auto_submitted.toLowerCase() !== "no")
  )
    return null;
  const text = stripEmailReply(payload.plain_body || "");
  return text || null;
}
let cached: { expires: number; keys: Record<string, any>[] } | null = null;
export async function verifyPostal(
  raw: string,
  signature: string | null,
  kid: string | null,
) {
  if (
    !signature ||
    !kid ||
    !process.env.POSTAL_JWKS_URL ||
    !/^https:\/\//.test(process.env.POSTAL_JWKS_URL) ||
    signature.length > 2048
  )
    return false;
  try {
    if (!cached || cached.expires < Date.now()) {
      const response = await fetch(process.env.POSTAL_JWKS_URL, {
        signal: AbortSignal.timeout(3000),
        redirect: "error",
        cache: "no-store",
      });
      if (!response.ok) return false;
      const result = await response.json();
      if (!Array.isArray(result.keys)) return false;
      cached = { keys: result.keys, expires: Date.now() + 300000 };
    }
    const key = cached.keys.find((k) => k.kid === kid && k.kty === "RSA");
    if (!key) return false;
    return verify(
      "RSA-SHA256",
      Buffer.from(raw),
      createPublicKey({ key, format: "jwk" }),
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}
