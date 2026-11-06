import {test,expect} from "@playwright/test";

test("Rapport ANC : restaure un vrai dossier multipage depuis le client, pas une page de synthèse isolée",async({page})=>{
 await page.goto("/#clients");
 await page.locator('[data-live-client="firstName"]').fill("Clara");
 await page.locator('[data-live-client="lastName"]').fill("DossierRapport");
 await page.locator('[data-live-client="address"]').fill("17 rue des Tilleuls");
 await page.locator('[data-live-client="postalCode"]').fill("82000");
 await page.locator('[data-live-client="city"]').fill("Montauban");
 await page.locator('[data-live-action="create-client"]').click();
 await expect(page.locator("#live-clients")).toContainText("Clara DossierRapport");
 await page.locator('[data-live-select-client]').first().click();
 await expect(page.locator('[data-path="owner.lastName"]')).toHaveValue("DossierRapport");
 await page.locator('#public-tabs [data-tab="rapport"]').click();
 const pages=page.locator("#report-pages>.a4");
 await expect(pages.first()).toBeVisible({timeout:15000});
 const count=await pages.count();
 expect(count).toBeGreaterThanOrEqual(24);
 await expect(page.locator("#anc-report-page-counter")).toContainText("pages A4");
 await expect(page.locator("#report-pages")).toContainText("Clara");
 await expect(page.locator("#report-pages")).toContainText("DossierRapport");
 await expect(page.locator("#report-pages")).toContainText("17 rue des Tilleuls");
 await expect(page.locator("#report-pages")).not.toContainText("Mme Sophie MARTIN");
 await expect(page.locator("#report-pages")).not.toContainText("12 route de la Démonstration");
 await expect(page.locator('#report-pages [data-anc-chapter="synthese"]')).toBeVisible();
 await expect(page.locator('#report-pages [data-anc-chapter="map-cadastre"]')).toBeVisible();
 await expect(page.locator('#report-pages [data-anc-chapter="map-implantation"]')).toBeVisible();
 await expect(page.locator('#report-pages [data-anc-chapter="signature"]')).toBeVisible();
 expect(await page.locator("#report-pages>.a4:visible").count()).toBe(count);
 await expect(page.locator("#report-pages")).toContainText("À renseigner");
});

test("Ancien modèle restauré : accès distinct à ses 29 pages, clairement identifiées comme données fictives",async({page})=>{
 await page.goto("/#rapport");
 const pages=page.locator("#report-pages>.a4");
 await expect(pages.first()).toBeVisible();
 await page.locator('[data-anc-report-view="historique"]').click();
 await expect(pages).toHaveCount(29);
 await expect(page.locator("#report-pages")).toHaveAttribute("data-report-mode","historique");
 await expect(page.locator("#report-pages .anc-report-model-watermark")).toHaveCount(29);
 await expect(page.locator("#anc-report-page-counter")).toContainText("29 pages A4");
 await page.locator('[data-anc-report-view="dossier"]').click();
 await expect(page.locator("#report-pages")).toHaveAttribute("data-report-mode","dossier");
 await expect(page.locator("#report-pages .anc-report-model-watermark")).toHaveCount(0);
 expect(await pages.count()).toBeGreaterThanOrEqual(24);
});

test("Export Word compatible réel : téléchargement du dossier en .doc, non une simulation",async({page})=>{
 await page.goto("/#rapport");
 await expect(page.locator("#report-pages>.a4").first()).toBeVisible();
 const promise=page.waitForEvent("download");
 await page.locator('[data-action="export-word"]').click();
 const dl=await promise;
 expect(dl.suggestedFilename()).toMatch(/^ANC_.*\.doc$/);
 const stream=await dl.createReadStream();
 const buffers=[];for await(const part of stream)buffers.push(part);
 const html=Buffer.concat(buffers).toString("utf8");
 expect(html).toContain("RAPPORT");
 expect(html).toContain("SPÉCIMEN");
 expect(html).toContain("Annexe");
 expect(html).not.toContain("Mme Sophie MARTIN");
});

test("L'impression ne masque aucune page A4 et affiche une page par feuille",async({page})=>{
 await page.goto("/#rapport");
 const count=await page.locator("#report-pages>.a4").count();
 await page.emulateMedia({media:"print"});
 const state=await page.locator("#report-pages>.a4").evaluateAll(nodes=>nodes.map(el=>({
  display:getComputedStyle(el).display,hidden:el.hidden,
  pageBreak:getComputedStyle(el).breakAfter
 })));
 expect(state).toHaveLength(count);
 expect(state.every(x=>x.display!=="none"&&!x.hidden)).toBe(true);
 expect(state.slice(0,-1).every(x=>x.pageBreak==="page"||x.pageBreak==="always")).toBe(true);
});
