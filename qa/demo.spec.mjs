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
  await expect(page.locator("#porchet .px-tabs .px-tab")).toHaveCount(5);
  await expect(page.locator("#porchet .px-table tbody tr")).toHaveCount(12);
  await expect(page.locator("#porchet .px-note")).toContainText("cases jaunes");
});

test("les fonctions confidentielles ne sont pas exécutées dans le public",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#etudes")).toBeVisible();
  await page.locator('[data-public-action="calculate"]').click();
  await expect(page.locator("#public-toast")).toBeVisible();
  await expect(page.locator("#axis-report-page")).toBeVisible();
  await expect(page.locator("#public-toast")).toContainText("Rapport actualisé");
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

test("Sprint 4 — saisie conservée, sauvegarde automatique et bouton Suivant",async({page})=>{
  await page.goto("/#dossier");
  const title=page.locator('[data-path="title"]');
  await expect(title).toBeVisible();
  await title.fill("Étude de démonstration Fred");
  await page.locator("#dossier .s4-footer [data-demo-nav='terrain']").click();
  await expect(page.locator("#terrain")).toBeVisible();
  await page.reload();
  await page.locator("#public-tabs [data-tab='dossier']").click();
  await expect(page.locator('[data-path="title"]')).toHaveValue("Étude de démonstration Fred");
  await expect(page.locator("#dossier .s4-save-label")).toContainText(/enregistr/i);
});

test("Sprint 4 — sondage et horizon duplicables avec sélecteur pente",async({page})=>{
  await page.goto("/#sondages");
  await expect(page.locator("#sondages .item-card").first()).toBeVisible();
  const count=await page.locator("#sondages .item-card").count();
  await page.locator("#sondages [data-action='duplicate-borehole']").first().click();
  await expect(page.locator("#sondages .item-card")).toHaveCount(count+1);
  const first=page.locator("#sondages .item-card").first();
  const horizonCount=await first.locator(".horizon").count();
  await first.locator("[data-demo-duplicate-horizon]").first().click();
  await expect(first.locator(".horizon")).toHaveCount(horizonCount+1);
  await first.locator(".s4-slope-comparator").first().selectOption("<");
  await expect(first.locator(".s4-slope-comparator").first()).toHaveValue("<");
  await page.locator("#public-tabs [data-tab='terrain']").click();
  await page.locator("#public-tabs [data-tab='sondages']").click();
  await expect(page.locator("#sondages .item-card")).toHaveCount(count+1);
});

test("Sprint 4 — détection fictive de la parcelle et recherche BRGM utilisables",async({page})=>{
  await page.goto("/#dossier");
  await page.locator("#anc-detect-parcel").click();
  await expect(page.locator("#anc-parcel-total")).toContainText("5 033");
  await page.locator("#public-tabs [data-tab='terrain']").click();
  await page.locator("#anc-brgm-fetch").click();
  await expect(page.locator("#anc-brgm-summary")).toContainText("démonstration");
});

test("Sprint 4 — photo matériel enregistrée une seule fois et réutilisable",async({page})=>{
  await page.goto("/#photos");
  await expect(page.locator(".s4-equipment")).toBeVisible();
  await page.locator(".s4-equipment-name").fill("Perméamètre test");
  await page.locator(".s4-equipment-file").setInputFiles({
    name:"materiel.png",mimeType:"image/png",
    buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+xqM0AAAAASUVORK5CYII=","base64")
  });
  await page.locator("[data-demo-equipment='add']").click();
  await expect(page.locator(".s4-preset")).toContainText("Perméamètre test");
  await page.reload();
  await expect(page.locator(".s4-preset")).toContainText("Perméamètre test");
  await page.locator("[data-demo-equipment-use]").click();
  await expect(page.locator(".s4-equipment-list")).toContainText("associé");
});

test("Sprint 4 — plus de message de blocage générique sur les boutons métier",async({page})=>{
  await page.goto("/#sondages");
  await page.locator("#sondages [data-action='add-borehole']").click();
  const msg=page.locator("#public-toast");
  await expect(msg).toBeVisible();
  await expect(msg).not.toContainText("Fonction métier volontairement réservée");
  await page.locator('[data-public-action="calculate"]').click();
  await expect(msg).toContainText("Rapport actualisé");
  await expect(page.locator("#axis-report-page")).toBeVisible();
});
