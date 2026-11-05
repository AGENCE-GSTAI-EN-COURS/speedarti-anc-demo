import {test,expect} from "@playwright/test";

test("Recette PC/mobile — la démo affiche ses limites avant toute étude",async({page})=>{
  await page.goto("/#dossier");
  const warning=page.getByRole("note");
  await expect(warning).toContainText("SPÉCIMEN");
  await expect(warning).toContainText("validation professionnelle");
  await expect(warning).toContainText("calculs réglementaires avancés restent privés");
});

test("Recette PC/mobile — un dossier reste local et les calculs Porchet restent en démonstration",async({page})=>{
  await page.goto("/#dossier");
  await page.locator('[data-path="owner.lastName"]').fill("RECETTE ANC LOCALE");
  await page.locator('#public-tabs [data-tab="rapport"]').click();
  await expect(page.locator("#axis-report-page")).toContainText("RECETTE ANC LOCALE");
  await page.reload();
  await expect(page.locator("#axis-report-page")).toContainText("RECETTE ANC LOCALE");
  await expect(page.getByRole("note")).toContainText("SPÉCIMEN");
});
