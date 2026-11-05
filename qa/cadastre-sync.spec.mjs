import {test,expect} from "@playwright/test";
test("Après sélection d'adresse, la fiche haute reprend référence et contenance du cadastre",async({page})=>{
  await page.route("**/geocodage/search?**",route=>route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({features:[{geometry:{type:"Point",coordinates:[1.353,44.017]},properties:{label:"12 rue des Lilas 82000 Montauban",score:.95}}]})
  }));
  await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({type:"FeatureCollection",features:[{type:"Feature",properties:{section:"AH",numero:"0039",contenance:2248},
      geometry:{type:"Polygon",coordinates:[[[1.3529,44.0169],[1.3531,44.0169],[1.3531,44.0171],[1.3529,44.0171],[1.3529,44.0169]]]}}]})
  }));
  await page.goto("/#dossier");
  await page.locator('[data-path="parcel.address"]').fill("12 rue des Lilas");
  await page.locator('[data-path="parcel.postalCode"]').fill("82000");
  await page.locator('[data-path="parcel.city"]').fill("Montauban");
  await page.locator('[data-action="geocode-address"]').click();
  await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("AH",{timeout:12000});
  await expect(page.locator('[data-path="parcel.number"]')).toHaveValue("0039");
  await expect(page.locator('[data-path="parcel.area"]')).toHaveValue("2248");
  await expect(page.locator(".geo-meta")).toContainText("AH 0039");
  await expect(page.locator("#anc-parcel-total")).toContainText("2 248");
  await page.reload();
  await expect(page.locator('[data-path="parcel.area"]')).toHaveValue("2248");
  await expect(page.locator('[data-path="parcel.number"]')).toHaveValue("0039");
});
test("Si la contenance source manque, calcul géométrique indicatif explicitement sourcé",async({page})=>{
  await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({features:[{type:"Feature",properties:{section:"CE",numero:"0123"},
      geometry:{type:"Polygon",coordinates:[[[1.35,44.02],[1.3501,44.02],[1.3501,44.0201],[1.35,44.0201],[1.35,44.02]]]}}]})
  }));
  await page.goto("/#dossier");
  await page.locator("details.geo-advanced summary").click();
  await page.locator('[data-path="parcel.lat"]').fill("44.02");
  await page.locator('[data-path="parcel.lng"]').fill("1.35");
  await page.locator("#anc-detect-parcel").click();
  await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("CE");
  await expect(page.locator('[data-path="parcel.number"]')).toHaveValue("0123");
  await expect(page.locator('[data-path="parcel.area"]')).not.toHaveValue("");
  await expect(page.locator(".anc-v3-parcel").last()).toContainText("surface géométrique indicative");
});

test("Régression terrain : la surface totale reste remplie après changement d'onglet",async({page})=>{
 await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:200,contentType:"application/json",
 body:JSON.stringify({features:[{type:"Feature",properties:{section:"BD",numero:"0018",contenance:"1 564"},geometry:{type:"Polygon",
 coordinates:[[[1.35,44.02],[1.3501,44.02],[1.3501,44.0201],[1.35,44.0201],[1.35,44.02]]]}}]})
 }));
 await page.goto("/#dossier");
 await page.locator("#anc-detect-parcel").click();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1564");
 await expect(page.locator("#anc-parcel-surface-source")).toContainText("contenance source");
 await page.locator('#public-tabs [data-tab="terrain"]').click();
 await page.locator('#public-tabs [data-tab="dossier"]').click();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1564");
 await page.reload();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("1564");
});
