import {test,expect} from "@playwright/test";

const ring=(x,y)=>[[x-.00007,y-.00007],[x+.00007,y-.00007],[x+.00007,y+.00007],[x-.00007,y+.00007],[x-.00007,y-.00007]];
const feature=(section,numero,contenance,x=1.35,y=44.02)=>({
 type:"Feature",properties:{section,numero,contenance},
 geometry:{type:"Polygon",coordinates:[ring(x,y)]}
});
const oldParcel=feature("AC","0031",489);
const correctParcel=feature("BD","0042",750,1.351,44.021);
const secondParcel=feature("BE","0021",880,1.352,44.022);
async function prepare(page,{alternatives=false}={}){
 let calls=0;
 await page.route("**/api/cadastre/parcelle?**",async route=>{
   calls++;
   await route.fulfill({status:200,contentType:"application/json",
     body:JSON.stringify({type:"FeatureCollection",features:calls===1?[oldParcel]:alternatives?[correctParcel,secondParcel]:[correctParcel]})
   });
 });
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator("details.geo-advanced summary").click();
 await page.locator('[data-path="parcel.lat"]').fill("44.02");
 await page.locator('[data-path="parcel.lng"]').fill("1.35");
 await page.locator("#anc-detect-parcel").click();
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("AC",{timeout:12000});
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("489");
 await expect(page.locator(".geo-map-frame .leaflet-container")).toBeVisible({timeout:15000});
 return ()=>calls;
}
async function clickDifferentParcelPoint(page){
 await page.locator('#dossier [data-anc-map-pick]').click();
 await expect(page.locator('#dossier [data-anc-map-pick]')).toHaveAttribute("aria-pressed","true");
 const map=page.locator("#dossier .anc-map-canvas");
 await map.click({position:{x:110,y:115}});
 await expect(page.locator("#anc-map-parcel-choice")).toBeVisible({timeout:12000});
}

test("Adresse mal positionnée : point sur carte puis confirmation remplace section et surface sans additionner",async({page})=>{
 const calls=await prepare(page);
 await clickDifferentParcelPoint(page);
 await expect(page.locator('#anc-map-parcel-choice option')).toHaveCount(1);
 await expect(page.locator('#anc-map-parcel-choice')).toContainText("BD");
 // Aucun champ modifié avant confirmation : le choix explicite est indispensable.
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("AC");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("489");
 await page.locator('[data-anc-map-confirm]').click();
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("BD");
 await expect(page.locator('[data-path="parcel.number"]')).toHaveValue("0042");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("750");
 await expect(page.locator('.anc-v3-parcel')).toHaveCount(1);
 await expect(page.locator('#anc-location-chain-status')).toContainText("Choix manuel sur carte");
 await expect(page.locator('[data-anc-map-pick]')).toHaveAttribute("aria-pressed","false");
 expect(calls()).toBe(2);
 await page.reload();
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("BD");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("750");
 await expect(page.locator('.geo-map-frame .leaflet-container')).toBeVisible();
});

test("Quand deux parcelles sont proposées, l'utilisateur choisit la bonne référence",async({page})=>{
 await prepare(page,{alternatives:true});
 await clickDifferentParcelPoint(page);
 await expect(page.locator("#anc-map-parcel-choice option")).toHaveCount(2);
 await page.locator("#anc-map-parcel-choice").selectOption("1");
 await page.locator('[data-anc-map-confirm]').click();
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("BE");
 await expect(page.locator('[data-path="parcel.number"]')).toHaveValue("0021");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("880");
});

test("Annuler un nouveau point conserve la parcelle d'origine",async({page})=>{
 await prepare(page);
 await clickDifferentParcelPoint(page);
 await page.locator('[data-anc-map-cancel]').click();
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("AC");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("489");
 await expect(page.locator('#anc-map-parcel-choice')).toHaveCount(0);
});

test("Accès à la correction parcellaire depuis Plans & métrés",async({page})=>{
 await prepare(page);
 await page.locator('#public-tabs [data-tab="geometrie"]').click();
 await expect(page.locator('.anc-real-map-card .leaflet-container')).toBeVisible({timeout:15000});
 await page.locator('#geometrie [data-anc-map-pick]').click();
 await page.locator('#geometrie .anc-map-canvas').click({position:{x:110,y:115}});
 await expect(page.locator("#anc-map-parcel-choice")).toBeVisible({timeout:12000});
 await page.locator('[data-anc-map-confirm]').click();
 await page.locator('#public-tabs [data-tab="dossier"]').click();
 await expect(page.locator('[data-path="parcel.section"]')).toHaveValue("BD");
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("750");
});
