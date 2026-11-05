import {test,expect} from "@playwright/test";

const sections=[
 "etudes","clients","dossier","terrain","sondages","porchet","geometrie",
 "photos","cartes","automatisation","regles","controles","tests","rapport"
];
for(const section of sections){
 test("Audit 14 écrans : "+section+" ne déclenche aucune erreur d'initialisation",async({page})=>{
   const errors=[];
   page.on("pageerror",err=>errors.push(err.message));
   await page.goto("/#"+section);
   await expect(page.locator("#public-sections section#"+section)).toBeVisible({timeout:14000});
   const runtime=await page.evaluate(()=>window.__ancMountError||null);
   expect(runtime,JSON.stringify(runtime)).toBeNull();
   expect(errors,errors.join(" | ")).toEqual([]);
 });
}
test("Dossier vierge : aucune valeur d'exemple présentée comme donnée réelle",async({page})=>{
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await expect(page.locator('[data-path="parcel.totalArea"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.altitude"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.availableArea"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.geologyCode"]')).toHaveValue("");
 await expect(page.locator('[data-path="parcel.slope"]')).toHaveValue("");
});
