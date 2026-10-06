import { db, databaseConfigured } from "@/lib/server/db";
import {
  inboundSchema,
  inboundSender,
  inboundText,
  verifyPostal,
} from "@/lib/server/inbound";
import { verifyReplyAddress, hashToken } from "@/lib/server/tokens";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!databaseConfigured())
    return new Response("Unavailable", { status: 503 });
  const limit = 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    return new Response("Too large", { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return new Response("Invalid payload", { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return new Response("Too large", { status: 413 });
    }
    chunks.push(chunk.value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (
    !(await verifyPostal(
      raw,
      request.headers.get("x-postal-signature-256"),
      request.headers.get("x-postal-signature-kid"),
    ))
  )
    return new Response("Unauthorized", { status: 401 });
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }
  const parsed = inboundSchema.safeParse(value);
  if (!parsed.success) return new Response("Invalid payload", { status: 400 });
  const payload = parsed.data;
  const routing = verifyReplyAddress(
    payload.rcpt_to,
    process.env.REPLY_DOMAIN || "",
  );
  const body = inboundText(payload);
  if (!routing || !body) return new Response("Ignored");
  const sender = inboundSender(payload.from);
  if (!sender || sender !== inboundSender(payload.mail_from))
    return new Response("Ignored");
  try {
    const { data, error } = await db().rpc("process_inbound_reply", {
      p_event: `postal:${hashToken(String(payload.id) + ":" + payload.rcpt_to)}`,
      p_trade: routing.id,
      p_role: routing.role === "o" ? "owner" : "requester",
      p_sender: sender,
      p_body: body,
    });
    if (error) throw error;
    return new Response(data ? "OK" : "Ignored");
  } catch {
    console.error("Inbound reply processing failed");
    return new Response("Please retry", { status: 429 });
  }
}
