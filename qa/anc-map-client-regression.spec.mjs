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

test("Carte active : charge Leaflet et les fonds de carte",async({page})=>{
 await page.goto("/#dossier");
 await expect(page.locator(".geo-map-frame .leaflet-container")).toBeVisible({timeout:20000});
 await expect(page.locator(".leaflet-control-layers")).toContainText("Orthophoto IGN");
 await page.locator('#public-tabs [data-tab="geometrie"]').click();
 await expect(page.locator(".anc-real-map-card .leaflet-container")).toBeVisible({timeout:20000});
});
test("Adresse → IGN → cadastre : les coordonnées et le contour sont reliés à la carte",async({page})=>{
 await page.route("**/geocodage/search?**",async(route)=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({features:[{geometry:{type:"Point",coordinates:[1.35,44.02]},properties:{label:"Adresse test à Montauban",score:.91}}]})
 }));
 await page.route("**/api/cadastre/parcelle?**",async(route)=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({features:[{type:"Feature",properties:{section:"AB",numero:"0042",contenance:725},geometry:{type:"Polygon",coordinates:[[[1.3499,44.0199],[1.3501,44.0199],[1.3501,44.0201],[1.3499,44.0201],[1.3499,44.0199]]]}}]})
 }));
 await page.goto("/#dossier");
 await expect(page.locator(".leaflet-container")).toBeVisible({timeout:20000});
 await page.locator('[data-path="parcel.address"]').fill("12 rue du Test");
 await page.locator('[data-path="parcel.postalCode"]').fill("82000");
 await page.locator('[data-path="parcel.city"]').fill("Montauban");
 await page.locator('[data-action="geocode-address"]').click();
 await expect(page.locator('[data-path="parcel.lat"]')).toHaveValue("44.02");
 await expect(page.locator(".anc-p-number").first()).toHaveValue("0042",{timeout:12000});
 expect(await page.locator(".geo-map-frame .leaflet-overlay-pane path").count()).toBeGreaterThan(0);
});
