import { test, expect } from "@playwright/test";

const image=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAIAAABvrngfAAAAFElEQVR4nGOsmRPMgAqYGDAANYUAohcBd+DX9OYAAAAASUVORK5CYII=","base64");

test("une photo jointe au dossier revient après rechargement et apparaît dans le rapport",async({page})=>{
 await page.goto("/#photos");
 const button=page.locator('#photos [data-action="add-photos"]').first();
 await expect(button).toBeVisible();
 const file=page.waitForEvent("filechooser");
 await button.click();
 await (await file).setFiles({name:"terrain-fictif.png",mimeType:"image/png",buffer:image});
 await expect(page.locator('[data-anc-dossier-photos]')).toContainText("terrain-fictif.png");
 await page.reload();
 await expect(page.locator('[data-anc-dossier-photos]')).toContainText("terrain-fictif.png");
 await page.locator('[data-tab="rapport"]').click();
 await expect(page.locator('#report-pages figure img[alt="terrain-fictif.png"]')).toBeVisible();
});

test("réouvrir une sauvegarde JSON restitue les parcelles, le plan et un horizon ajouté",async({page})=>{
 await page.goto("/#dossier");
 await page.locator('[data-path="title"]').fill("Sauvegarde de recette fictive");
 await page.evaluate(()=>{
   window.ANCRealWorkflow.mutateStudy(st=>{
     st.parcels=[{id:"p1",section:"ZZ",number:"0010",area:400,source:"Fictif",checkedAt:"2026-11-20"}];
     st.plan={width:80,height:60,mode:"trench",points:[{x:1,y:2},{x:11,y:2}]};
     st.cells.sondages=[{fields:{"boreholes.0.label":"S-TEST","boreholes.0.horizons.2.soil":"Limon"}},];
   });
 });
 const exported=page.waitForEvent("download");
 await page.locator('[data-public-action="export"]').click();
 const download=await exported;
 const file=page.waitForEvent("filechooser");
 await page.locator('[data-public-action="import"]').click();
 await (await file).setFiles(await download.path());
 await expect(page.locator("#live-studies")).toContainText("Sauvegarde de recette fictive");
 await page.locator('[data-tab="sondages"]').click();
 await expect(page.locator('[data-path="boreholes.0.horizons.2.soil"]')).toHaveValue("Limon");
 await page.locator('[data-tab="rapport"]').click();
 await expect(page.locator("#report-pages")).toContainText("0010");
});
