import {test,expect} from "@playwright/test";
test("Dossier : créer un client directement puis le retrouver dans l'étude",async({page})=>{
 await page.goto("/#dossier");
 await expect(page.locator("#anc-dossier-client-actions")).toBeVisible();
 await page.locator('[data-live-action="dossier-new-client"]').click();
 await page.locator('[data-dossier-client="firstName"]').fill("Lucie");
 await page.locator('[data-dossier-client="lastName"]').fill("Durand");
 await page.locator('[data-dossier-client="city"]').fill("Montauban");
 await page.locator('[data-live-action="save-dossier-client"]').click();
 await expect(page.locator('[data-path="owner.lastName"]')).toHaveValue("Durand");
 await expect(page.locator('[data-path="parcel.city"]')).toHaveValue("Montauban");
});
test("Dossier : un nouveau dossier n'hérite pas des coordonnées et du client fictifs",async({page})=>{
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await expect(page.locator('[data-path="owner.lastName"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.address"]')).toHaveValue("");
 await expect(page.locator(".anc-map-canvas")).toBeVisible();
});
test("Dossier et plan : carte interactive affichée ou erreur explicite",async({page})=>{
 await page.goto("/#dossier");
 await expect(page.locator(".anc-map-canvas")).toBeVisible();
 await expect.poll(async()=>await page.locator("#anc-live-map-status").innerText()).not.toContain("Chargement de la carte");
 await page.locator('#public-tabs [data-tab="geometrie"]').click();
 await expect(page.locator(".anc-real-map-card .anc-map-canvas")).toBeVisible();
 await expect(page.locator("#anc-v3-live-map")).toBeHidden();
});
