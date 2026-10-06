import { PGlite } from "@electric-sql/pglite";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
let pg: PGlite;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    let sql = readFileSync(`supabase/migrations/${file}`, "utf8").replace(
      "create extension if not exists pgcrypto;",
      "",
    );
    await pg.exec(sql);
  }
}, 30000);
afterAll(async () => {
  await pg?.close();
});
const itemId = "11111111-1111-4111-8111-111111111111";
const tradeId = "22222222-2222-4222-8222-222222222222";
describe("PostgreSQL migrations and transactions", () => {
  it("denies anon and authenticated reads and function execution", async () => {
    for (const role of ["anon", "authenticated"]) {
      await pg.exec(`set role ${role}`);
      await expect(
        pg.query<Record<string, any>>("select * from public.parts_items"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        pg.query<Record<string, any>>(
          "select public.consume_rate_limit('key',1,60)",
        ),
      ).rejects.toThrow(/permission denied/);
      await pg.exec("reset role");
    }
    const { rows } = await pg.query<{
      tablename: string;
      rowsecurity: boolean;
    }>("select tablename,rowsecurity from pg_tables where schemaname='public'");
    expect(rows.length).toBeGreaterThan(15);
    expect(rows.every((r) => r.rowsecurity)).toBe(true);
  });
  it("consumes rate limits atomically and resets expired windows", async () => {
    const first = await pg.query<{ ok: boolean }>(
      "select public.consume_rate_limit('test',2,60) as ok",
    );
    expect(first.rows[0].ok).toBe(true);
    await pg.query<Record<string, any>>(
      "select public.consume_rate_limit('test',2,60)",
    );
    const third = await pg.query<{ ok: boolean }>(
      "select public.consume_rate_limit('test',2,60) as ok",
    );
    expect(third.rows[0].ok).toBe(false);
    await pg.query<Record<string, any>>(
      "update public.rate_limits set expires_at=now()-interval '1 minute'",
    );
    expect(
      (
        await pg.query<{ ok: boolean }>(
          "select public.consume_rate_limit('test',2,60) as ok",
        )
      ).rows[0].ok,
    ).toBe(true);
  });
  it("creates unconfirmed guest listing with outbox and confirms once", async () => {
    const listing = {
      id: itemId,
      owner_type: "guest",
      owner_name: "Marco Berger",
      guest_email: "m@example.ch",
      title: "Winterreifen",
      description: "Gute Reifen",
      category: "reifen",
      condition: "gebraucht_gut",
      fits: [],
      quantity: 4,
      offer_type: "verkauf",
      price_chf: 180,
      negotiable: false,
      shipping_possible: false,
      pickup_zip: "8000",
      pickup_canton: "ZH",
      payment_mode: "twint-direct",
      twint_phone: "+41790001122",
    };
    await pg.query<Record<string, any>>(
      "select public.create_listing($1,$2,$3)",
      [
        JSON.stringify(listing),
        "listing-hash",
        JSON.stringify({
          recipient: "m@example.ch",
          subject: "Bestätigen",
          body: "Test",
        }),
      ],
    );
    expect(
      (
        await pg.query<Record<string, any>>(
          "select email_confirmed_at from parts_items where id=$1",
          [itemId],
        )
      ).rows[0].email_confirmed_at,
    ).toBeNull();
    expect(
      (
        await pg.query<{ ok: boolean }>(
          "select public.confirm_listing($1,$2) as ok",
          [itemId, "listing-hash"],
        )
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await pg.query<{ ok: boolean }>(
          "select public.confirm_listing($1,$2) as ok",
          [itemId, "listing-hash"],
        )
      ).rows[0].ok,
    ).toBe(false);
  });
  it("creates inquiry, hides TWINT until explicit one-time release", async () => {
    const trade = {
      id: tradeId,
      item_id: itemId,
      requester_type: "guest",
      requester_email: "r@example.ch",
      requester_name: "Rita Meier",
      message: "Ist das Teil verfügbar?",
      twint_requested: true,
      access_token_hash: "requester-hash",
    };
    const tokens = [
      {
        token_hash: "twint-hash",
        subject_id: tradeId,
        purpose: "twint-release",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    ];
    const mails = [
      {
        dedupe_key: `inquiry:${tradeId}:owner`,
        recipient: "m@example.ch",
        subject: "Anfrage",
        body: "Neue Anfrage",
      },
      {
        dedupe_key: `inquiry:${tradeId}:requester`,
        recipient: "r@example.ch",
        subject: "Anfrage",
        body: "Anfrage gesendet",
      },
    ];
    await pg.query<Record<string, any>>(
      "select public.create_inquiry($1,$2,$3)",
      [JSON.stringify(trade), JSON.stringify(tokens), JSON.stringify(mails)],
    );
    expect(
      JSON.stringify(
        (await pg.query<Record<string, any>>("select * from email_outbox"))
          .rows,
      ),
    ).not.toContain("+41790001122");
    expect(
      (
        await pg.query<{ ok: boolean }>("select release_twint($1,$2) as ok", [
          tradeId,
          "forged",
        ])
      ).rows[0].ok,
    ).toBe(false);
    expect(
      (
        await pg.query<{ ok: boolean }>("select release_twint($1,$2) as ok", [
          tradeId,
          "twint-hash",
        ])
      ).rows[0].ok,
    ).toBe(true);
    await pg.query<Record<string, any>>("select release_twint($1,$2)", [
      tradeId,
      "twint-hash",
    ]);
    expect(
      (
        await pg.query<{ count: number }>(
          "select count(*)::int as count from parts_messages where body like '%+41790001122%' ",
        )
      ).rows[0].count,
    ).toBe(1);
    expect(
      (
        await pg.query<{ count: number }>(
          "select count(*)::int as count from email_outbox where dedupe_key=$1",
          [`twint-released:${tradeId}`],
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it("reserves and completes the item and rejects requester completion", async () => {
    expect(
      (
        await pg.query<{ ok: boolean }>(
          "select transition_trade($1,$2,$3) as ok",
          [tradeId, "requester", "complete"],
        )
      ).rows[0].ok,
    ).toBe(false);
    expect(
      (
        await pg.query<{ ok: boolean }>(
          "select transition_trade($1,$2,$3) as ok",
          [tradeId, "owner", "accept"],
        )
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await pg.query<Record<string, any>>(
          "select status from parts_items where id=$1",
          [itemId],
        )
      ).rows[0].status,
    ).toBe("reserved");
    await pg.query<Record<string, any>>("select transition_trade($1,$2,$3)", [
      tradeId,
      "owner",
      "complete",
    ]);
    expect(
      (
        await pg.query<Record<string, any>>(
          "select status from parts_items where id=$1",
          [itemId],
        )
      ).rows[0].status,
    ).toBe("completed");
    expect(
      (
        await pg.query<{ ok: boolean }>(
          "select add_trade_message($1,$2,$3) as ok",
          [tradeId, "requester", "Noch da?"],
        )
      ).rows[0].ok,
    ).toBe(false);
  });
  it("hides after exactly three open reports and logs once", async () => {
    for (let i = 0; i < 3; i++) {
      await pg.query<Record<string, any>>(
        "insert into parts_reports(item_id,reason,reporter_ip_hash) values($1,'spam',$2)",
        [itemId, `hash-${i}`],
      );
      const item = (
        await pg.query<Record<string, any>>(
          "select moderation_hidden_at from parts_items where id=$1",
          [itemId],
        )
      ).rows[0];
      expect(item.moderation_hidden_at !== null).toBe(i === 2);
    }
    expect(
      (
        await pg.query<{ count: number }>(
          "select count(*)::int as count from parts_moderation_log",
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it("rejects forged and foreign inbound replies, deduplicates valid mail and closes daily notices", async () => {
    const call = (event: string, sender: string) =>
      pg.query<{ ok: boolean }>(
        "select process_inbound_reply($1,$2,$3,$4,$5) as ok",
        [event, tradeId, "requester", sender, "Bonjour"],
      );
    expect((await call("wrong", "evil@example.ch")).rows[0].ok).toBe(false);
    expect((await call("closed1", "r@example.ch")).rows[0].ok).toBe(true);
    await call("closed1", "r@example.ch");
    await call("closed2", "r@example.ch");
    expect(
      (
        await pg.query<{ count: number }>(
          "select count(*)::int as count from email_outbox where dedupe_key like 'closed-reply:%'",
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it("limits wanted groups to five and total open articles to ten", async () => {
    const article = {
      id: "33333333-3333-4333-8333-333333333333",
      group_id: "44444444-4444-4444-8444-444444444444",
      group_title: "Winterreifen gesucht",
      owner_name: "Rita Meier",
      guest_email: "wanted@example.ch",
      category: "reifen",
      make: "Volkswagen",
      model: "Golf 7",
      min_condition: "gebraucht",
      offer: "kauf",
      max_price_chf: 200,
      pickup_zip: "8000",
      auto_check: {},
    };
    const create = async (n: number, group: string, hash: string) => {
      const rows = Array.from({ length: n }, (_, index) => ({
        ...article,
        id: crypto.randomUUID(),
        group_id: group,
      }));
      return pg.query<{ ok: boolean }>("select create_wanted($1,$2,$3) as ok", [
        JSON.stringify(rows),
        hash,
        JSON.stringify({ subject: "Bestätigen", body: "Test" }),
      ]);
    };
    await expect(create(6, article.group_id, "six")).rejects.toThrow(
      "Invalid article count",
    );
    expect((await create(5, article.group_id, "wanted-hash")).rows[0].ok).toBe(
      true,
    );
    expect(
      (await create(5, crypto.randomUUID(), "wanted-two")).rows[0].ok,
    ).toBe(true);
    expect(
      (await create(1, crypto.randomUUID(), "wanted-extra")).rows[0].ok,
    ).toBe(false);
    expect(
      (
        await pg.query<{ ok: boolean }>("select confirm_wanted($1,$2) as ok", [
          article.group_id,
          "wanted-hash",
        ])
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await pg.query<{ ok: boolean }>("select confirm_wanted($1,$2) as ok", [
          article.group_id,
          "wanted-hash",
        ])
      ).rows[0].ok,
    ).toBe(false);
  });
  it("requires verified account email for linking guest data", async () => {
    const id = crypto.randomUUID();
    await pg.query<Record<string, any>>(
      "insert into auth.users(id,email) values($1,$2)",
      [id, "m@example.ch"],
    );
    await expect(
      pg.query<Record<string, any>>("select link_verified_guests($1)", [id]),
    ).rejects.toThrow("Email not verified");
    await pg.query<Record<string, any>>(
      "update auth.users set email_confirmed_at=now() where id=$1",
      [id],
    );
    await pg.query<Record<string, any>>("select link_verified_guests($1)", [
      id,
    ]);
    const row = (
      await pg.query<Record<string, any>>(
        "select owner_user_id,guest_email from parts_items where id=$1",
        [itemId],
      )
    ).rows[0];
    expect(row.owner_user_id).toBe(id);
    expect(row.guest_email).toBeNull();
  });
});

it("admin mutations enforce roles, require reasons and record an audit", async () => {
  const admin = "88888888-8888-4888-8888-888888888881";
  const mod = "88888888-8888-4888-8888-888888888882";
  const business = "88888888-8888-4888-8888-888888888883";
  await pg.query(
    "insert into auth.users(id,email) values($1,'admin@example.test'),($2,'mod@example.test')",
    [admin, mod],
  );
  await pg.query(
    "insert into profiles(id,display_name,role) values($1,'Admin','admin'),($2,'Mod','moderator')",
    [admin, mod],
  );
  await pg.query(
    "insert into businesses(id,owner_user_id,slug,name,uid_number,address,zip,city,canton) values($1,$2,'test-admin','Test','CHE-123.456.789','Teststrasse','8000','Zürich','ZH')",
    [business, admin],
  );
  await expect(
    pg.query("select admin_manage_entry($1,$2,'item','hide','Grund')", [
      business,
      itemId,
    ]),
  ).rejects.toThrow(/Forbidden/);
  await expect(
    pg.query("select admin_manage_entry($1,$2,'business','verify','Grund')", [
      mod,
      business,
    ]),
  ).rejects.toThrow(/Forbidden/);
  const noReason = await pg.query<{ ok: boolean }>(
    "select admin_manage_entry($1,$2,'item','hide',' ') as ok",
    [admin, itemId],
  );
  expect(noReason.rows[0].ok).toBe(false);
  await pg.query("select admin_manage_entry($1,$2,'item','unhide','Geprüft')", [
    mod,
    itemId,
  ]);
  expect(
    (
      await pg.query<{ moderation_hidden_at: string | null }>(
        "select moderation_hidden_at from parts_items where id=$1",
        [itemId],
      )
    ).rows[0].moderation_hidden_at,
  ).toBeNull();
  await pg.query(
    "select admin_manage_entry($1,$2,'business','verify','UID geprüft')",
    [admin, business],
  );
  expect(
    (
      await pg.query<{ verified_at: string | null }>(
        "select verified_at from businesses where id=$1",
        [business],
      )
    ).rows[0].verified_at,
  ).not.toBeNull();
  expect(
    (
      await pg.query<{ reason: string }>(
        "select reason from parts_moderation_log where actor_user_id=$1 and action='verify_business'",
        [admin],
      )
    ).rows[0].reason,
  ).toBe("UID geprüft");
  for (const role of ["anon", "authenticated"]) {
    await pg.exec(`set role ${role}`);
    await expect(
      pg.query("select admin_manage_entry($1,$2,'item','hide','Grund')", [
        admin,
        itemId,
      ]),
    ).rejects.toThrow(/permission denied/);
    await pg.exec("reset role");
  }
});

it("commercial decisions are admin-only and audit atomically without charging", async () => {
  const admin = "88888888-8888-4888-8888-888888888881";
  const mod = "88888888-8888-4888-8888-888888888882";
  const request = "99999999-9999-4999-8999-999999999991";
  await pg.query(
    "insert into commercial_requests(id,user_id,email,offer,name,quoted_price_chf) values($1,$2,'admin@example.test','starter','Garage',39)",
    [request, admin],
  );
  await expect(
    pg.query("select decide_commercial_request($1,$2,'accepted','Test')", [
      mod,
      request,
    ]),
  ).rejects.toThrow(/Forbidden/);
  await pg.query(
    "select decide_commercial_request($1,$2,'accepted','Pilot vereinbart')",
    [admin, request],
  );
  expect(
    (
      await pg.query<{ status: string }>(
        "select status from commercial_requests where id=$1",
        [request],
      )
    ).rows[0].status,
  ).toBe("accepted");
  expect(
    (
      await pg.query<{ note: string }>(
        "select note from commercial_request_log where request_id=$1",
        [request],
      )
    ).rows[0].note,
  ).toBe("Pilot vereinbart");
  await pg.exec("set role authenticated");
  await expect(pg.query("select * from commercial_requests")).rejects.toThrow(
    /permission denied/,
  );
  await expect(
    pg.query("select decide_commercial_request($1,$2,'declined','Test')", [
      admin,
      request,
    ]),
  ).rejects.toThrow(/permission denied/);
  await pg.exec("reset role");
});

it("CRM restricts mutation to admins and audits contacts and notes", async () => {
  const admin = "88888888-8888-4888-8888-888888888881";
  const mod = "88888888-8888-4888-8888-888888888882";
  const payload = {
    id: "",
    name: "Garage Test",
    email: "test@example.test",
    company: "Test",
    phone: "",
    stage: "lead",
    note: "Pilot",
    nextContact: "2026-10-15",
  };
  await expect(
    pg.query("select crm_save_contact($1,$2::jsonb)", [
      mod,
      JSON.stringify(payload),
    ]),
  ).rejects.toThrow(/Forbidden/);
  const result = await pg.query<{ id: string }>(
    "select crm_save_contact($1,$2::jsonb) as id",
    [admin, JSON.stringify(payload)],
  );
  const id = result.rows[0].id;
  await pg.query("select crm_save_contact($1,$2::jsonb)", [
    admin,
    JSON.stringify({ ...payload, id, stage: "pilot" }),
  ]);
  await pg.query(
    "select crm_add_note($1,$2,'Telefonat: Interesse bestätigt')",
    [admin, id],
  );
  expect(
    (
      await pg.query<{ stage: string }>(
        "select stage from crm_contacts where id=$1",
        [id],
      )
    ).rows[0].stage,
  ).toBe("pilot");
  expect(
    (
      await pg.query<{ count: number }>(
        "select count(*)::int as count from crm_activity where contact_id=$1",
        [id],
      )
    ).rows[0].count,
  ).toBe(3);
  await expect(
    pg.query("select crm_add_note($1,$2,'')", [admin, id]),
  ).rejects.toThrow();
  expect(
    (await pg.query("select * from admin_listing_trend(7)")).rows,
  ).toHaveLength(7);
  for (const role of ["anon", "authenticated"]) {
    await pg.exec(`set role ${role}`);
    await expect(pg.query("select * from crm_contacts")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      pg.query("select * from admin_listing_trend(7)"),
    ).rejects.toThrow(/permission denied/);
    await pg.exec("reset role");
  }
});

it("imports a partner request to CRM exactly once", async () => {
  const admin = "88888888-8888-4888-8888-888888888881";
  const request = "99999999-9999-4999-8999-999999999991";
  const first = await pg.query<{ id: string }>(
    "select crm_import_request($1,$2) as id",
    [admin, request],
  );
  const second = await pg.query<{ id: string }>(
    "select crm_import_request($1,$2) as id",
    [admin, request],
  );
  expect(second.rows[0].id).toBe(first.rows[0].id);
  expect(
    (
      await pg.query<{ count: number }>(
        "select count(*)::int as count from crm_activity where contact_id=$1",
        [first.rows[0].id],
      )
    ).rows[0].count,
  ).toBe(1);
});
