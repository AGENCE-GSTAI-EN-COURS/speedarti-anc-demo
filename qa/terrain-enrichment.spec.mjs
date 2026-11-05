import {test,expect} from "@playwright/test";

const parcel={type:"FeatureCollection",features:[{
 type:"Feature",properties:{section:"AD",numero:"0049",contenance:489},
 geometry:{type:"Polygon",coordinates:[[[1.3499,44.0199],[1.3501,44.0199],[1.3501,44.0201],[1.3499,44.0201],[1.3499,44.0199]]]}
}]};
async function newLocatedDossier(page){
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator(".geo-advanced summary").click();
 await page.locator('[data-path="parcel.lat"]').fill("44.02");
 await page.locator('[data-path="parcel.lng"]').fill("1.35");
 await page.locator("#anc-detect-parcel").click();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("489",{timeout:12000});
}
test("Latitude et longitude lisibles, altitude IGN réelle simulée, estimations réservées aux surfaces saisies",async({page})=>{
 await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(parcel)}));
 await page.route("**/altimetrie/1.0/calcul/alti/rest/elevation.json?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({elevations:[{lon:1.35,lat:44.02,z:115.67,acc:"Précision variable"}]})}));
 await newLocatedDossier(page);
 await expect(page.locator("#anc-coord-lat")).toContainText("44.0200000");
 await expect(page.locator("#anc-coord-lon")).toContainText("1.3500000");
 await expect(page.locator('[data-path="parcel.altitude"]')).toHaveValue("115.67",{timeout:12000});
 await expect(page.locator("#anc-altitude-source")).toContainText("IGN RGE ALTI");
 await expect(page.locator('[data-path="parcel.availableArea"]')).toHaveValue("");
 await expect(page.locator("#anc-availability-status")).toContainText("À déterminer");
 await expect(page.locator('[data-path="parcel.slope"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.geologyCode"]')).toHaveValue("");
 await page.locator("#anc-available-estimator summary").click();
 await page.locator("#anc-occupied-area").fill("130");
 await page.locator("#anc-excluded-area").fill("50");
 await page.locator('[data-anc-terrain-action="estimate"]').click();
 await expect(page.locator('[data-path="parcel.availableArea"]')).toHaveValue("309");
 await expect(page.locator("#anc-availability-status")).toContainText("non réglementaire");
 await page.reload();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("489");
 await expect(page.locator('[data-path="parcel.altitude"]')).toHaveValue("115.67");
 await expect(page.locator("#anc-coord-lat")).toContainText("44.0200000");
 await expect(page.locator('[data-path="parcel.availableArea"]')).toHaveValue("309");
});

test("Altimétrie indisponible (-99999) : altitude laissée vide et avertissement explicite",async({page})=>{
 await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(parcel)}));
 await page.route("**/altimetrie/1.0/calcul/alti/rest/elevation.json?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({elevations:[{z:-99999}]})}));
 await newLocatedDossier(page);
 await expect(page.locator('[data-path="parcel.altitude"]')).toHaveValue("");
 await expect(page.locator("#anc-elevation-state")).toContainText("Altitude non récupérée",{timeout:12000});
});

test("Estimation indisponible si zones non renseignées ; aucune assimilation à la parcelle",async({page})=>{
 await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(parcel)}));
 await page.route("**/altimetrie/1.0/calcul/alti/rest/elevation.json?**",route=>route.fulfill({status:503,body:"Indisponible"}));
 await newLocatedDossier(page);
 await page.locator("#anc-available-estimator summary").click();
 await page.locator('[data-anc-terrain-action="estimate"]').click();
 await expect(page.locator("#anc-availability-status")).toContainText("Renseigner les deux valeurs");
 await expect(page.locator('[data-path="parcel.availableArea"]')).toHaveValue("");
 await page.locator("#anc-occupied-area").fill("500");
 await page.locator("#anc-excluded-area").fill("0");
 await page.locator('[data-anc-terrain-action="estimate"]').click();
 await expect(page.locator("#anc-availability-status")).toContainText("Surfaces incompatibles");
 await expect(page.locator('[data-path="parcel.availableArea"]')).toHaveValue("");
});
