import { describe, it, expect, beforeEach } from "vitest";
import sharp from "sharp";
import { toPlainText, escapeHtml, stripEmailReply } from "@/lib/plain-text";
import {
  issueToken,
  verifyToken,
  hashToken,
  replyAddress,
  verifyReplyAddress,
} from "@/lib/server/tokens";
import { publicItemDTO } from "@/lib/public-dto";
import { DEMO_ITEMS } from "@/lib/demo";
import { sanitiseImage, ownPhotoUrl } from "@/lib/server/images";
import {
  listingSchema,
  emailSchema,
  wantedSchema,
} from "@/lib/listing.schemas";
import { filterDemo } from "@/lib/server/catalog";
import { readFileSync } from "node:fs";
beforeEach(() => {
  process.env.TOKEN_SECRET = "test-secret-with-more-than-thirty-two-characters";
});
describe("Plain text", () => {
  it("removes executable markup, comments and invisible characters", () =>
    expect(
      toPlainText(
        " <script>alert(1)</script><svg><script>x</script></svg><!--secret--><b>Reifen</b>\u202e\u200b ",
      ),
    ).toBe("Reifen"));
  it("preserves comparison operators, umlauts and ampersands", () =>
    expect(toPlainText("Profiltiefe < 40 & Räder > 20")).toBe(
      "Profiltiefe < 40 & Räder > 20",
    ));
  it("normalises whitespace", () =>
    expect(toPlainText(" A\r\n\r\n\r\nB\u0000 ")).toBe("A\n\nB"));
  it("escapes email content", () =>
    expect(escapeHtml('<img onerror="x">&')).toBe(
      "&lt;img onerror=&quot;x&quot;&gt;&amp;",
    ));
  it("removes quotes and signatures", () =>
    expect(
      stripEmailReply(
        "Hallo\n> alter Text\nAm Montag schrieb Marco:\nalter Text",
      ),
    ).toBe("Hallo"));
});
describe("Signed tokens and reply routing", () => {
  it("checks purpose and expiry", () => {
    const t = issueToken("subject", "management", 60, 100000);
    expect(verifyToken(t, "management", 110000)).toEqual({
      subject: "subject",
    });
    expect(verifyToken(t, "trade", 110000)).toBeNull();
    expect(verifyToken(t, "management", 160000)).toBeNull();
  });
  it("rejects tampering and extra components", () => {
    const t = issueToken("subject", "management");
    expect(verifyToken(t + "x", "management")).toBeNull();
    expect(verifyToken(t + ".extra", "management")).toBeNull();
    expect(hashToken(t)).toHaveLength(64);
  });
  it("authenticates an 80-bit reply HMAC with role binding", () => {
    const id = DEMO_ITEMS[0].id;
    const address = replyAddress(id, "o", "reply.example.ch");
    expect(verifyReplyAddress(address, "reply.example.ch")).toEqual({
      id,
      role: "o",
    });
    expect(
      verifyReplyAddress(address.replace("o", "r"), "reply.example.ch"),
    ).toBeNull();
    expect(verifyReplyAddress(address, "evil.ch")).toBeNull();
  });
});
describe("Public data", () => {
  it("builds a whitelist and never returns private fields", () => {
    const row = {
      ...DEMO_ITEMS[0],
      owner_type: "guest",
      owner_name: "Marco Berger",
      guest_email: "private@example.com",
      requester_email: "buyer@example.com",
      twint_phone: "+41790001122",
      owner_user_id: "secret",
      phone: "secret",
      future_private_field: "secret",
    };
    const dto = publicItemDTO(row);
    const json = JSON.stringify(dto);
    for (const name of [
      "guest_email",
      "requester_email",
      "twint_phone",
      "owner_user_id",
      "phone",
      "future_private_field",
      "private@example.com",
      "+41790001122",
      "secret",
    ])
      expect(json).not.toContain(name);
    expect(dto.seller_name).toBe("Marco B.");
  });
  it("filters tire dimensions, price and make/year together", () => {
    expect(
      filterDemo(DEMO_ITEMS, {
        width: 205,
        ratio: 55,
        diameter: 16,
        make: "Volkswagen",
        year: 2015,
        max: 200,
      }),
    ).toHaveLength(1);
    expect(filterDemo(DEMO_ITEMS, { year: 2000 })).toHaveLength(0);
    expect(filterDemo(DEMO_ITEMS, { q: "5G1941035" })).toHaveLength(1);
  });
});
describe("Image pipeline", () => {
  it("resizes to 1280, strips EXIF and appended code", async () => {
    const jpeg = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: "#abc" },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Artist: "private artist" } } })
      .toBuffer();
    const payload = Buffer.concat([
      jpeg,
      Buffer.from("<?php evil ?><script>alert(1)</script>"),
    ]);
    const output = await sanitiseImage(
      "data:image/jpeg;base64," + payload.toString("base64"),
    );
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(1280);
    expect(meta.height).toBe(960);
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(output.includes(Buffer.from("<?php"))).toBe(false);
    expect(output.includes(Buffer.from("<script>"))).toBe(false);
  });
  it("rejects SVG and shell text and truncated JPEG", async () => {
    await expect(
      sanitiseImage(
        "data:image/svg+xml;base64," + Buffer.from("<svg/>").toString("base64"),
      ),
    ).rejects.toThrow();
    await expect(
      sanitiseImage(
        "data:image/jpeg;base64," +
          Buffer.from("#!/bin/sh\nrm -rf /").toString("base64"),
      ),
    ).rejects.toThrow();
    const image = await sharp({
      create: { width: 50, height: 50, channels: 3, background: "red" },
    })
      .jpeg()
      .toBuffer();
    await expect(
      sanitiseImage(
        "data:image/jpeg;base64," + image.subarray(0, 70).toString("base64"),
      ),
    ).rejects.toThrow();
  });
  it("limits upload input and accepts only own bucket URLs", () => {
    expect(
      ownPhotoUrl(
        "https://project.supabase.co/storage/v1/object/public/parts-photos/photo.webp",
        "https://project.supabase.co",
      ),
    ).toBe(true);
    expect(
      ownPhotoUrl(
        "https://evil.ch/storage/v1/object/public/parts-photos/photo.webp",
        "https://project.supabase.co",
      ),
    ).toBe(false);
    expect(
      ownPhotoUrl(
        "https://project.supabase.co/storage/v1/object/public/other/photo.webp",
        "https://project.supabase.co",
      ),
    ).toBe(false);
  });
});
describe("Validation", () => {
  const good = {
    title: "<b>Winterreifen</b>",
    description: "Guter Zustand",
    category: "reifen",
    condition: "gebraucht_gut",
    offer_type: "verkauf_bar",
    price_chf: 180,
    owner_name: "Marco Berger",
    guest_email: "marco@example.ch",
    pickup_zip: "8000",
    pickup_canton: "ZH",
  };
  it("cleans every stored free-text and rejects six photos", () => {
    expect(listingSchema.parse(good).title).toBe("Winterreifen");
    expect(
      listingSchema.safeParse({
        ...good,
        photos: Array(6).fill("https://example.ch/photo.webp"),
      }).success,
    ).toBe(false);
  });
  it("requires positive sale price and a TWINT number", () => {
    expect(listingSchema.safeParse({ ...good, price_chf: 0 }).success).toBe(
      false,
    );
    expect(
      listingSchema.safeParse({
        ...good,
        offer_type: "verkauf",
        payment_mode: "twint-direct",
      }).success,
    ).toBe(false);
  });
  it("rejects header injection", () => {
    expect(
      emailSchema.safeParse("person@example.ch\r\nBcc: evil@example.ch")
        .success,
    ).toBe(false);
    expect(emailSchema.parse("A_B@example.ch")).toBe("a_b@example.ch");
  });
  it("caps wanted articles at five", () => {
    const article = {
      category: "reifen",
      make: "VW",
      model: "Golf",
      oem_number: "",
      min_condition: "gebraucht",
      offer: "kauf",
      max_price_chf: 100,
    };
    expect(
      wantedSchema.safeParse({
        group_title: "Winterräder gesucht",
        owner_name: "Marco Berger",
        guest_email: "m@example.ch",
        note: "",
        pickup_zip: "8000",
        captchaToken: "test",
        articles: Array(6).fill(article),
      }).success,
    ).toBe(false);
  });
});
describe("Migration contract (static check, does not replace database tests)", () => {
  it("enables deny-all RLS and revokes clients", () => {
    const sql = readFileSync(
      "supabase/migrations/202610030001_initial.sql",
      "utf8",
    );
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("force row level security");
    expect(sql).toContain("revoke all on public.%I from anon, authenticated");
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).toContain("cardinality(photos)<=5");
  });
});
