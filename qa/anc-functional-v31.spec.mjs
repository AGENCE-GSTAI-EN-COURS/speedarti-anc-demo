import {test,expect} from "@playwright/test";
test("Sondages : ajouter deux sondages vides et deux horizons puis conserver",async({page})=>{
 await page.goto("/#sondages");
 const list=page.locator("#sondages .item-card");const original=await list.count();
 await page.locator('[data-action="add-borehole"]').first().click();
 await expect(list).toHaveCount(original+1);
 const last=list.last();
 await expect(last.locator('input[data-path$=".label"]').first()).toHaveValue("S"+(original+1));
 await last.locator('[data-action="add-horizon"]').first().click();
 await expect(last.locator(".horizon")).toHaveCount(2);
 await page.locator('#public-tabs [data-tab="terrain"]').click();
 await page.locator('#public-tabs [data-tab="sondages"]').click();
 await expect(page.locator("#sondages .item-card")).toHaveCount(original+1);
});
test("Porchet : métadonnées dossier préremplies, lignes modifiables et zéro minute sans division",async({page})=>{
 await page.goto("/#dossier");
 await page.locator('[data-path="reference"]').fill("ANC-FRED-TEST");
 await page.locator('[data-path="owner.firstName"]').fill("Julie");
 await page.locator('[data-path="owner.lastName"]').fill("Martin");
 await page.locator('[data-path="parcel.city"]').fill("Caussade");
 await page.locator('#public-tabs [data-tab="porchet"]').click();
 await expect(page.locator('[data-px-field="dossier"]')).toHaveValue("ANC-FRED-TEST");
 await expect(page.locator('[data-px-field="client"]')).toHaveValue("Julie Martin");
 await expect(page.locator('[data-px-field="commune"]')).toHaveValue("Caussade");
 const n=await page.locator("[data-px-time]").count();
 await page.locator("[data-px-add]").click();
 await expect(page.locator("[data-px-time]")).toHaveCount(n+1);
 await page.locator('[data-px-time="1"]').fill("0");
 await page.locator('[data-px-time="2"]').fill("0");
 await page.locator('[data-px-time="3"]').fill("2");
 await expect(page.locator('[data-px-time="1"]')).toHaveValue("0");
 await page.reload();
 await expect(page.locator("[data-px-time]")).toHaveCount(n+1);
 await expect(page.locator('[data-px-time="3"]')).toHaveValue("2");
});
test("Terrain : météo officielle simulée avec source, sans inventer résultats risques",async({page})=>{
 await page.route("**/v1/archive?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({daily:{precipitation_sum:[3.4],temperature_2m_max:[17.6],temperature_2m_min:[9.2]}})}));
 await page.goto("/#dossier");
 await page.locator("details.geo-advanced summary").click();
 await page.locator('[data-path="parcel.lat"]').fill("44.02");
 await page.locator('[data-path="parcel.lng"]').fill("1.35");
 await page.locator('#public-tabs [data-tab="terrain"]').click();
 await page.locator("#anc-weather-fetch").click();
 await expect(page.locator("#anc-field-source-result")).toContainText("Open-Meteo");
 await expect(page.locator('[data-path="visit.weather"]')).toHaveValue(/3.4 mm/);
});
test("Rapport : plusieurs pages sans page de synthèse isolée",async({page})=>{
 await page.goto("/#rapport");
 await expect(page.locator("#report-pages > section")).toHaveCount(9);
 await expect(page.locator("#report-pages > section").first()).toContainText("Rapport d’étude de conception ANC");
 await expect(page.locator("#axis-report-page")).toContainText("VALIDATION PROFESSIONNELLE OBLIGATOIRE");
});
test("Cartes dossier : vues absentes ne sont pas présentées comme validées",async({page})=>{
 await page.goto("/#cartes");
 await expect(page.locator("#anc-live-map-gallery")).toContainText("Aucune carte enregistrée");
 await expect(page.locator("#cartes .map-card:visible")).toHaveCount(0);
});

test("Plans & métrés : une vue sélectionnée apparaît dans les cartes du dossier",async({page})=>{
 await page.goto("/#dossier");
 await page.locator("details.geo-advanced summary").click();
 await page.locator('[data-path="parcel.lat"]').fill("44.02");
 await page.locator('[data-path="parcel.lng"]').fill("1.35");
 await page.locator('#public-tabs [data-tab="geometrie"]').click();
 await expect(page.locator(".anc-real-map-card .leaflet-container")).toBeVisible({timeout:20000});
 await page.locator('[data-anc-map-view="cadastre"]').click();
 await page.locator('[data-anc-map-save]').click();
 await page.locator('#public-tabs [data-tab="cartes"]').click();
 await expect(page.locator("#anc-live-map-gallery")).toContainText("Plan cadastral");
 await page.reload();
 await expect(page.locator("#anc-live-map-gallery")).toContainText("Plan cadastral");
});
