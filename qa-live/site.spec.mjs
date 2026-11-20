import {test,expect} from "@playwright/test";

test("Dossier fictif publié — lecture Supabase sans connexion",async({page})=>{
  await page.goto("?build=mission-2#etudes");
  const response=page.waitForResponse(r=>r.url().includes("/rest/v1/anc_demo_specimens?"));
  await page.getByRole("button",{name:"Ouvrir le dossier d’exemple Supabase"}).click();
  expect((await response).status()).toBe(200);
  await expect(page.locator("[data-anc-example-status]")).toContainText("Dossier Supabase ouvert");
  await expect(page.locator('[data-path="reference"]')).toHaveValue("ANC-EXEMPLE-001");
  await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1000");
  await page.locator('#public-tabs [data-tab="sondages"]').click();
  await expect(page.locator('[data-path="boreholes.1.label"]')).toHaveValue("S2");
  await page.locator('#public-tabs [data-tab="photos"]').click();
  await expect(page.getByAltText("Schéma fictif de la maison et des tranchées")).toBeVisible();
  await page.locator('#public-tabs [data-tab="rapport"]').click();
  await expect(page.locator("#report-pages")).toContainText("ANC-EXEMPLE-001");
});

test("Site GitHub Pages — la version publiée charge le moteur interactif",async({page})=>{
  await page.goto("?build=20261102#dossier",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#dossier")).toBeVisible();
  await expect(page.locator(".brand")).toContainText("02/11/2026");
  const status=await page.evaluate(()=>({
    geo:typeof window.ANCGeoParcel?.mount,
    live:typeof window.ANCRealWorkflow?.mount,
    porchet:typeof window.ANCPorchetExcel?.calculate,
    checks:typeof window.ANCRealControls?.analyze
  }));
  expect(status).toEqual({geo:"function",live:"function",porchet:"function",checks:"function"});
});

test("Site GitHub Pages — surface réellement saisie puis enregistrée",async({page})=>{
  await page.goto("?build=20261102#dossier");
  await expect(page.locator("#anc-v3-parcel-list")).toBeVisible();
  await page.locator(".anc-p-surface").first().fill("7100");
  await page.locator("#anc-add-parcel").click();
  await page.locator(".anc-p-surface").last().fill("300");
  await expect(page.locator("#anc-parcel-total")).toContainText("7 400");
  await page.reload();
  await expect(page.locator("#anc-parcel-total")).toContainText("7 400");
  await expect(page.locator(".anc-v3-parcel")).toHaveCount(2);
});

test("Site GitHub Pages — Porchet et rapport à partir des données saisies",async({page})=>{
  await page.goto("?build=20261102#dossier");
  await expect(page.locator("#dossier")).toBeVisible();
  await page.locator('[data-path="owner.lastName"]').fill("TEST REEL PUBLIC");
  await page.locator('#public-tabs [data-tab="porchet"]').click();
  await page.locator('#porchet [data-px-tab="KP1"]').click();
  await page.locator('#porchet [data-px-field="diameter"]').fill("150");
  await page.locator('#porchet [data-px-field="height"]').fill("150");
  await page.locator('#porchet [data-px-grad="0"]').fill("1180");
  await page.locator('#porchet [data-px-grad="1"]').fill("1173");
  await expect(page.locator("#porchet .px-total")).toContainText("7,453");
  await page.locator('#public-tabs [data-tab="rapport"]').click();
  await expect(page.locator("#axis-report-page")).toContainText("TEST REEL PUBLIC");
  await expect(page.locator("#axis-report-page")).toContainText("7.453");
});


test("Site GitHub Pages — le modèle Fred est VRAIMENT publié et visible avec au moins 29 pages",async({page,request})=>{
 const [theme,engine]=await Promise.all([
   request.get("assets/fred-report-theme.css"),
   request.get("assets/report-restoration.js")
 ]);
 expect(theme.status()).toBe(200);
 expect(engine.status()).toBe(200);
 expect(await theme.text()).toContain("anc-fred-cover-photo");
 expect(await engine.text()).toContain("ANCReportRestoration");

 await page.goto("?build=20261106-fred#rapport",{waitUntil:"domcontentloaded"});
 await expect.poll(async()=>page.locator("#report-pages>.a4").count(),{timeout:18000}).toBeGreaterThanOrEqual(29);
 await expect(page.locator(".anc-fred-cover-top")).toBeVisible();
 await expect(page.locator('.anc-fred-toc-row').first()).toBeVisible();
 await expect(page.locator('#report-pages [data-anc-chapter="sommaire"]')).toHaveCSS("background-color","rgb(155, 221, 101)");
 await expect(page.locator("#axis-report-page")).toContainText("VALIDATION PROFESSIONNELLE OBLIGATOIRE");
 const cssLoaded=await page.evaluate(()=>Array.from(document.styleSheets).some(s=>s.href?.includes("fred-report-theme.css")));
 expect(cssLoaded).toBe(true);
});


test("Site publié ANC — 14 vues, filtres BRGM et enregistrement de composition avec réouverture",async({page,request})=>{
 const asset=await request.get("assets/map-runtime.js");
 expect(asset.status()).toBe(200);
 expect(await asset.text()).toContain("anc-map-filter-list");
 await page.goto("?build=20261106-maplayers#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator("details.geo-advanced summary").click();
 await page.locator('[data-path="parcel.lat"]').fill("44.02");
 await page.locator('[data-path="parcel.lng"]').fill("1.35");
 await page.locator('#public-tabs [data-tab="geometrie"]').click();
 await expect(page.locator(".anc-real-map-card .leaflet-container")).toBeVisible({timeout:20000});
 await expect(page.locator("#geometrie .anc-map-presets [data-anc-map-view]")).toHaveCount(14);
 await expect(page.locator("#geometrie [data-anc-overlay]")).toHaveCount(7);
 await page.locator('[data-anc-map-view="groundwater"]').first().click();
 await page.locator('[data-anc-map-save]').click();
 await expect(page.locator("#anc-map-save-result")).toContainText("enregistré");
 await page.locator('[data-anc-map-open-gallery]').click();
 await expect(page.locator("#anc-gallery-count")).toContainText("1 composition");
 await page.reload();
 await expect(page.locator("#anc-live-map-gallery")).toContainText("Remontée de nappe");
 await page.locator('[data-anc-reopen-map]').first().click();
 await expect(page.locator('[data-anc-map-view="groundwater"]')).toHaveAttribute("aria-pressed","true");
});
