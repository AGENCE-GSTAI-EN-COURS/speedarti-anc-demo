import {test,expect} from "@playwright/test";

const searchResult={features:[{type:"Feature",geometry:{type:"Point",coordinates:[1.35,44.02]},properties:{
 label:"8 rue des Tilleuls 82000 Montauban",name:"8 rue des Tilleuls",postcode:"82000",city:"Montauban",score:0.96
}}]};
const parcelResult={type:"FeatureCollection",features:[{type:"Feature",properties:{section:"AC",numero:"0071",contenance:"1 564"},
 geometry:{type:"Polygon",coordinates:[[[1.3499,44.0199],[1.3501,44.0199],[1.3501,44.0201],[1.3499,44.0201],[1.3499,44.0199]]]}}]};
async function mockOfficialServices(page){
 await page.route("**/geocodage/search?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(searchResult)}));
 await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(parcelResult)}));
}

test("Client local complet → Dossier prérempli → géocodage et contenance cadastrale automatiques",async({page})=>{
 await mockOfficialServices(page);
 await page.goto("/#clients");
 await expect(page.locator("#live-clients")).toBeVisible();
 const data={
   civility:"Mme",firstName:"Lucie",lastName:"Fournier",company:"Bois et Terre",
   email:"lucie@example.test",phone:"0601020304",
   address:"8 rue des Tilleuls",postalCode:"82000",city:"Montauban",department:"82",
   mainRooms:"5",occupants:"4"
 };
 for(const [key,value] of Object.entries(data)){
   await page.locator('[data-live-client="'+key+'"]').fill(value);
 }
 await page.locator('[data-live-action="create-client"]').click();
 await expect(page.locator('[data-live-select-client]')).toHaveCount(1);
 await page.locator('[data-live-select-client]').first().click();
 await expect(page.locator("#dossier")).toBeVisible({timeout:15000});
 await expect(page.locator('[data-path="owner.lastName"]')).toHaveValue("Fournier");
 await expect(page.locator('[data-path="owner.email"]')).toHaveValue("lucie@example.test");
 await expect(page.locator('[data-path="owner.phone"]')).toHaveValue("0601020304");
 await expect(page.locator('[data-path="parcel.address"]')).toHaveValue("8 rue des Tilleuls");
 await expect(page.locator('[data-path="parcel.postalCode"]')).toHaveValue("82000");
 await expect(page.locator('[data-path="building.mainRooms"]')).toHaveValue("5");
 await expect(page.locator('[data-path="parcel.altitude"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.geologyCode"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1564",{timeout:15000});
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("AC");
 await expect(page.locator('[data-path="parcel.number"]')).toHaveValue("0071");
 await expect(page.locator("#anc-parcel-total")).toContainText("1");
 await expect(page.locator("#anc-location-chain-status")).toContainText("Localisation enregistrée");
 await page.reload();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1564");
 await expect(page.locator('[data-path="owner.lastName"]')).toHaveValue("Fournier");
});

test("Localisation placée avant identification et adresse saisie manuellement → cadastre complet",async({page})=>{
 await mockOfficialServices(page);
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await expect(page.locator("#dossier")).toBeVisible();
 const sections=await page.locator("#dossier > article").evaluateAll(els=>els.map(el=>
  el.querySelector(".card-head h2")?.textContent||el.querySelector("h2")?.textContent||""));
 expect(sections.indexOf("Localisation automatique")).toBeLessThan(sections.indexOf("Identification du dossier"));
 await page.locator('[data-location-entry="parcel.address"]').fill("8 rue des Tilleuls");
 await page.locator('[data-location-entry="parcel.postalCode"]').fill("82000");
 await page.locator('[data-location-entry="parcel.city"]').fill("Montauban");
 await page.locator('[data-action="geocode-address"]').click();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1564",{timeout:15000});
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("AC");
 await expect(page.locator('[data-path="parcel.number"]')).toHaveValue("0071");
 await expect(page.locator('[data-path="parcel.lat"]')).toHaveValue("44.02");
 await expect(page.locator('[data-location-entry="parcel.city"]')).toHaveValue("Montauban");
});

test("GPS → géocodage inverse → adresse + section + surface, sans faux résultat",async({page,context})=>{
 await context.grantPermissions(["geolocation"]);
 await context.setGeolocation({latitude:44.02,longitude:1.35});
 await page.route("**/geocodage/reverse?**",route=>route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({features:[{properties:{label:"8 rue des Tilleuls 82000 Montauban",
    name:"8 rue des Tilleuls",postcode:"82000",city:"Montauban",citycode:"82121"}}]})}));
 await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(parcelResult)}));
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator('[data-action="use-device-gps"]').click();
 await expect(page.locator('[data-path="parcel.lat"]')).toHaveValue("44.02",{timeout:15000});
 await expect(page.locator('[data-path="parcel.city"]')).toHaveValue("Montauban");
 await expect(page.locator('[data-location-entry="parcel.address"]')).toHaveValue("8 rue des Tilleuls");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1564",{timeout:15000});
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("AC");
});

test("Client sans adresse n'hérite jamais de la surface ou de la géologie du spécimen",async({page})=>{
 await page.goto("/#clients");
 await page.locator('[data-live-client="firstName"]').fill("Nora");
 await page.locator('[data-live-client="lastName"]').fill("SansAdresse");
 await page.locator('[data-live-action="create-client"]').click();
 await page.locator('[data-live-select-client]').last().click();
 await expect(page.locator("#dossier")).toBeVisible({timeout:15000});
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.area"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.altitude"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.geologyText"]')).toHaveValue("");
 await expect(page.locator("#anc-location-chain-status")).toContainText("Compléter l'adresse");
});

test("Bouton Détecter la parcelle sans coordonnées : déclenche d'abord l'adresse IGN",async({page})=>{
 await mockOfficialServices(page);
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator('[data-location-entry="parcel.address"]').fill("8 rue des Tilleuls");
 await page.locator('[data-location-entry="parcel.postalCode"]').fill("82000");
 await page.locator('[data-location-entry="parcel.city"]').fill("Montauban");
 await page.locator('[data-action="detect-parcel"]').click();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1564",{timeout:15000});
 await expect(page.locator('[data-path="parcel.number"]')).toHaveValue("0071");
});
