import { test, expect } from "@playwright/test";

const slugs=["etudes","clients","dossier","terrain","sondages","porchet","geometrie","photos","cartes","automatisation","regles","controles","tests","rapport"];

test("l'interface ANC V3 originale s'affiche sans erreur JavaScript", async ({page})=>{
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".brand strong")).toHaveText("SpeedArti ANC");
  await expect(page.locator(".public-warning")).toContainText("SPÉCIMEN");
  await expect(page.locator("#public-tabs .tab")).toHaveCount(14);
  await expect(page.locator("#etudes .section-head")).toBeVisible();
  expect(errors).toEqual([]);
});

test("les quatorze onglets métier V3 sont présents et accessibles",async({page})=>{
  await page.goto("/");
  for(const id of slugs){
    await page.locator("#public-tabs [data-tab='"+id+"']").click();
    await expect(page.locator("section#"+id)).toBeVisible();
    await expect(page.locator("#public-tabs [data-tab='"+id+"']")).toHaveAttribute("aria-current","page");
  }
});

test("les panneaux AXIS pédologie sont visibles dans l'interface V3",async({page})=>{
  await page.goto("/#sondages");
  await expect(page.locator("#axis-pedology-intro")).toBeVisible();
  await expect(page.locator(".axis-touch-soils").first()).toBeVisible();
  await expect(page.locator(".axis-touch-soils").first().getByRole("checkbox").first()).toBeVisible();
});

test("les plans AXIS et les annotations proviennent de la vraie interface V3",async({page})=>{
  await page.goto("/#geometrie");
  await expect(page.locator("#axis-metric-panel")).toBeVisible();
  await expect(page.locator("#axis-plan-types")).toBeVisible();
  await expect(page.locator("#axis-trench-panel")).toBeVisible();
  await page.locator(".axis-ann-add").click();
  await expect(page.locator(".axis-ann-quality").first()).toBeVisible();
});

test("l'essai Porchet montre le statut professionnel et ses relevés",async({page})=>{
  await page.goto("/#porchet");
  await expect(page.locator("#axis-porchet-validation")).toBeVisible();
  await expect(page.locator("#axis-porchet-validation")).toContainText("NON VALIDÉE");
});

test("les fonctions confidentielles ne sont pas exécutées dans le public",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#etudes")).toBeVisible();
  await page.locator('[data-public-action="calculate"]').click();
  await expect(page.locator("#public-toast")).toBeVisible();
  await expect(page.locator("#public-toast")).toContainText("scénario fictif");
});

test("le rapport garde la présentation V3 et sa validation humaine",async({page})=>{
  await page.goto("/#rapport");
  await expect(page.locator("#axis-report-page")).toBeVisible();
  await expect(page.locator("#axis-report-page")).toContainText("VALIDATION PROFESSIONNELLE OBLIGATOIRE");
});

test("les sections publiques sont dépourvues de scripts",async({page})=>{
  await page.goto("/#sondages");
  await expect(page.locator("#sondages")).toBeVisible();
  expect(await page.locator("#public-sections script").count()).toBe(0);
  const payload=await page.locator("#public-sections").innerHTML();
  expect(payload).not.toContain("window.SpeedArtiANC");
  expect(payload).not.toContain("github_pat_");
});
