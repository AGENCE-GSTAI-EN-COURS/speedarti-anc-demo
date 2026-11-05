import {test,expect} from "@playwright/test";

test("Client → cadastre : échec altimétrique temporaire puis reprise automatique, une seule fois",async({page})=>{
 let attempts=0;
 await page.route("**/geocodage/search?**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({features:[{type:"Feature",geometry:{type:"Point",coordinates:[1.35,44.02]},properties:{label:"8 rue des Tilleuls 82000 Montauban",name:"8 rue des Tilleuls",postcode:"82000",city:"Montauban",score:.95}}]})}));
 await page.route("**/api/cadastre/parcelle?**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({features:[{type:"Feature",properties:{section:"BD",numero:"0049",contenance:489},geometry:{type:"Polygon",coordinates:[[[1.3499,44.0199],[1.3501,44.0199],[1.3501,44.0201],[1.3499,44.0201],[1.3499,44.0199]]]}}]})}));
 await page.route("**/altimetrie/1.0/calcul/alti/rest/elevation.json?**",route=>{
   attempts++;
   if(attempts===1)return route.fulfill({status:503,body:"Temporary failure"});
   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({elevations:[{z:89.45,acc:"Précision variable"}]})});
 });
 await page.goto("/#clients");
 await page.locator('[data-live-client="firstName"]').fill("Lucie");
 await page.locator('[data-live-client="lastName"]').fill("Martin");
 await page.locator('[data-live-client="address"]').fill("8 rue des Tilleuls");
 await page.locator('[data-live-client="postalCode"]').fill("82000");
 await page.locator('[data-live-client="city"]').fill("Montauban");
 await page.locator('[data-live-action="create-client"]').click();
 await expect(page.locator("#live-clients")).toContainText("Lucie Martin");
 await expect(page.locator('[data-live-select-client]')).toHaveCount(1);
 await page.locator('[data-live-select-client]').first().click();
 await expect(page.locator("#dossier")).toBeVisible();
 await expect(page.locator('[data-path="owner.lastName"]')).toHaveValue("Martin");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("489",{timeout:14000});
 await expect(page.locator('[data-path="parcel.altitude"]')).toHaveValue("89.45",{timeout:14000});
 expect(attempts).toBe(2);
 await page.reload();
 await expect(page.locator('[data-path="parcel.altitude"]')).toHaveValue("89.45");
});
