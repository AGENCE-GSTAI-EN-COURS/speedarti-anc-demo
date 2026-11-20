import { test, expect } from "@playwright/test";

test("le dossier Supabase s'ouvre sans connexion et conserve son contenu entre les écrans", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/rest/v1/anc_demo_specimens?**", async route => {
    requestCount++;
    expect(route.request().method()).toBe("GET");
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ json: [{
      payload: {
        name: "Étude ANC — exemple Supabase",
        fields: { title: "Étude ANC — exemple Supabase", reference: "ANC-EXEMPLE-001" },
        parcels: [],
        sondages: [{ fields: { "boreholes.0.label": "S-TEST", "boreholes.0.depth": "90" } }],
        maps: [],
        porchet: { version: 1, active: "KP1", sheets: {} },
        illustration: "data:image/jpeg;base64,AA==",
      },
    }] });
  });

  await page.goto("/");
  await page.getByRole("button",{name:"Ouvrir le dossier d’exemple Supabase"}).click();
  await expect(page.locator("[data-anc-example-status]")).toContainText("Dossier Supabase ouvert");
  await expect(page.locator('[data-path="reference"]')).toHaveValue("ANC-EXEMPLE-001");
  await page.locator('[data-tab="sondages"]').click();
  await expect(page.locator('[data-path="boreholes.0.label"]')).toHaveValue("S-TEST");
  await page.locator('[data-tab="rapport"]').click();
  await expect(page.locator("#report-pages")).toContainText("S-TEST");
  expect(requestCount).toBe(1);
});

test("une indisponibilité Supabase conserve l'étude locale", async ({ page }) => {
  await page.route("**/rest/v1/anc_demo_specimens?**", route => route.fulfill({ status: 503, json: {} }));
  await page.goto("/");
  await page.getByRole("button",{name:"Ouvrir le dossier d’exemple Supabase"}).click();
  await expect(page.locator("[data-anc-example-status]")).toContainText("Impossible d’ouvrir");
  await expect(page.locator("#live-studies")).toContainText("Étude ANC — exemple");
});
