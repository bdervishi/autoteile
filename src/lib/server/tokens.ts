import "server-only";
import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
function secret() {
  const value = process.env.TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error("Missing token secret");
  return value;
}
export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function issueToken(
  subject: string,
  purpose: string,
  lifetime = 7 * 86400,
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({
      subject,
      purpose,
      expires: Math.floor(now / 1000) + lifetime,
      nonce: randomBytes(24).toString("hex"),
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function verifyToken(
  token: string,
  purpose: string,
  now = Date.now(),
): { subject: string } | null {
  try {
    const [payload, signature, ...extra] = token.split(".");
    if (
      extra.length ||
      !payload ||
      !signature ||
      !equal(
        signature,
        createHmac("sha256", secret()).update(payload).digest("base64url"),
      )
    )
      return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.purpose === purpose &&
      typeof data.subject === "string" &&
      Number.isInteger(data.expires) &&
      data.expires > now / 1000
      ? { subject: data.subject }
      : null;
  } catch {
    return null;
  }
}
export function replyAddress(id: string, role: "o" | "r", domain: string) {
  const hex = id.replace(/-/g, "");
  if (!/^[a-f0-9]{32}$/.test(hex)) throw new Error("Invalid UUID");
  const mac = createHmac("sha256", secret())
    .update(`${id}:${role}`)
    .digest("hex")
    .slice(0, 20);
  return `antwort+${hex}${role}${mac}@${domain}`;
}
export function verifyReplyAddress(address: string, domain: string) {
  const match = address.match(
    /^antwort\+([a-f0-9]{32})([or])([a-f0-9]{20})@(.+)$/,
  );
  if (!match || match[4] !== domain) return null;
  const h = match[1];
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  const role = match[2] as "o" | "r";
  return equal(replyAddress(id, role, domain), address) ? { id, role } : null;
}
