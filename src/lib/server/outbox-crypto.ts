import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
function key() {
  const secret = process.env.TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("Missing token secret");
  return createHash("sha256")
    .update("teileboerse:outbox:v1:")
    .update(secret)
    .digest();
}
// Email bodies containing access links are encrypted; only token hashes remain searchable in PostgreSQL.
export function sealOutbox(body: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(body, "utf8"),
    cipher.final(),
  ]);
  return `enc:v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}
export function openOutbox(body: string) {
  if (!body.startsWith("enc:v1:")) return body;
  const parts = body.split(":");
  if (parts.length !== 5) throw new Error("Invalid outbox body");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(parts[2], "base64url"),
  );
  decipher.setAuthTag(Buffer.from(parts[3], "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[4], "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
