import { test, expect } from "@playwright/test";
test("landing has working calls to action and no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Steht im Keller. Fehlt in der Garage.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Zur Teilebörse", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Das passende Teil. Ganz in der Nähe." }),
  ).toBeVisible();
});
test("demo search finds an OEM part without private payload fields", async ({
  page,
}) => {
  const response = await page.goto("/teile?q=5G1941035", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "LED-Scheinwerfer links · Golf 7" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Winterreifen 205/55 R16 · 4 Stück" }),
  ).toHaveCount(0);
  const html = await response!.text();
  for (const key of [
    "guest_email",
    "requester_email",
    "twint_phone",
    "owner_user_id",
  ])
    expect(html).not.toContain(key);
});
test("wizard preserves fields, advances and fails honestly without services", async ({
  page,
}) => {
  await page.goto("/teile/neu", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Titel", { exact: true }).fill("Test-Winterreifen");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByLabel("Preis (CHF)").fill("180");
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(page.getByLabel("Titel", { exact: true })).toHaveValue(
    "Test-Winterreifen",
  );
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByLabel("Abholort (PLZ)").fill("8000");
  await page
    .getByRole("combobox", { name: "Kanton", exact: true })
    .selectOption("ZH");
  await page.getByLabel("Dein Name", { exact: true }).fill("Test Person");
  await page
    .getByLabel("Deine E-Mail-Adresse", { exact: true })
    .fill("test@example.ch");
  await page.getByRole("button", { name: "Inserat veröffentlichen" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Inserieren ist noch nicht eingerichtet" }),
  ).toContainText("Inserieren ist noch nicht eingerichtet");
});
test("detail and wanted routes render and six wanted articles cannot be added", async ({
  page,
}) => {
  await page.goto("/teile/00000000-0000-4000-8000-000000000001", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Interesse? Schreib eine Nachricht." }),
  ).toBeVisible();
  await page.goto("/teile/gesuch/neu", { waitUntil: "domcontentloaded" });
  const button = page.getByRole("button", {
    name: /Weiteren Artikel hinzufügen/,
  });
  for (let i = 0; i < 4; i++) await button.click();
  await expect(button).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Artikel 5", exact: true }),
  ).toBeVisible();
});

test("landing tire selection carries into the real search", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("combobox", { name: "Breite (mm)", exact: true })
    .selectOption("225");
  await page
    .getByRole("combobox", { name: "Querschnitt (%)", exact: true })
    .selectOption("45");
  await page
    .getByRole("combobox", { name: "Felge (Zoll)", exact: true })
    .selectOption("17");
  await page
    .getByRole("button", { name: "Passende Reifen finden", exact: true })
    .click();
  await expect(page).toHaveURL(/width=225&ratio=45&diameter=17/);
  await expect(
    page.getByRole("heading", { name: "Das passende Teil. Ganz in der Nähe." }),
  ).toBeVisible();
});

test("hero pins and its layers advance while the page scrolls", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const hero = page.locator(".hero");
  await expect(hero).toHaveClass(/sc-act--pinned/);
  const before = await page
    .locator(".wheel-plane")
    .evaluate((el) => getComputedStyle(el).transform);
  await page.evaluate(() => window.scrollTo(0, innerHeight * 0.7));
  await expect
    .poll(() =>
      page
        .locator(".wheel-plane")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .not.toBe(before);
  const stage = await page.locator(".hero>.sc-stage").evaluate((el) => ({
    position: getComputedStyle(el).position,
    top: el.getBoundingClientRect().top,
  }));
  expect(stage.position).toBe("sticky");
  expect(stage.top).toBeGreaterThanOrEqual(0);
  expect(stage.top).toBeLessThan(100);
});

test("reduced motion exposes every offer without pinning", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".offer-rail")).toHaveCSS("display", "grid");
  await expect(page.locator(".landing-offers .sc-stage")).toHaveCSS(
    "position",
    "relative",
  );
  await expect(
    page.getByRole("heading", { name: "Bar bei Abholung", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("landing search works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".offer-rail")).toHaveCSS("display", "grid");
  await page.getByRole("button", { name: "Passende Reifen finden" }).click();
  await expect(page).toHaveURL(/width=205&ratio=55&diameter=16/);
  await context.close();
});

test("admin preview is labelled and exposes no live mutation buttons", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Alles im Blick." }),
  ).toBeVisible();
  await expect(
    page.getByText("Vorschau · Supabase noch nicht eingerichtet"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Admin-Anmeldung" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ausblenden", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Als geprüft markieren" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("monetization pilot has transparent prices and no inactive payment claims", async ({
  page,
}) => {
  await page.goto("/preise");
  await expect(
    page.getByRole("heading", {
      name: "Privat gratis. Gewerblich mehr Möglichkeiten.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Pilotpaket anfragen" }),
  ).toHaveCount(3);
  await page.getByRole("link", { name: "Pilotpaket anfragen" }).nth(1).click();
  await expect(page).toHaveURL(/angebot=pro/);
  await expect(page.locator('select[name="offer"]')).toHaveValue("pro");
  await expect(
    page.getByRole("button", { name: "Unverbindlich anfragen" }),
  ).toBeDisabled();
  await page.goto("/admin/umsatz");
  await expect(
    page.getByRole("heading", { name: "Kommerzielle Anfragen" }),
  ).toBeVisible();
  await expect(
    page.getByText("Vormerkungen sind keine Einnahmen.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("admin workspace navigates CRM, inventory and statistics in preview", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Adminnavigation" })
    .getByRole("link", { name: "CRM & Kontakte" })
    .click();
  await expect(
    page.getByRole("heading", { name: "CRM & Kontakte" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kontakt speichern" }),
  ).toBeDisabled();
  await page
    .getByRole("navigation", { name: "Adminnavigation" })
    .getByRole("link", { name: "Inserateübersicht" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Inserateübersicht" }),
  ).toBeVisible();
  await page.locator('select[name="status"]').selectOption("completed");
  await page.getByRole("button", { name: "Filtern", exact: true }).click();
  await expect(
    page.getByText("Beispiel: Winterräder 205/55 R16", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Adminnavigation" })
    .getByRole("link", { name: "Statistik", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Statistik", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Vorschau · Alle Kennzahlen sind Beispieldaten."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
