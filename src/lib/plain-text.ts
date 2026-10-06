export function toPlainText(value: unknown): unknown {
  if (typeof value !== "string") return value;
  let text = value;
  // Repeat: removing a nested tag can expose another dangerous tag.
  for (let i = 0; i < 10; i++) {
    const clean = text.replace(
      /<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      "",
    );
    if (clean === text) break;
    text = clean;
  }
  return text
    .replace(/<!--[^]*?(?:-->|$)/g, "")
    .replace(/<\/?[a-z!?][^<>]*>/gi, "")
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g,
      "",
    )
    .replace(/\r\n?/g, "\n")
    .replace(/\n[\t ]*\n(?:[\t ]*\n)+/g, "\n\n")
    .trim();
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function stripEmailReply(value: string) {
  return toPlainText(
    value
      .split(/\n(?:Am .+ schrieb .+:|On .+ wrote:|--\s*$)/m)[0]
      .split("\n")
      .filter((line) => !/^\s*>/.test(line))
      .join("\n")
      .slice(0, 2000),
  ) as string;
}
