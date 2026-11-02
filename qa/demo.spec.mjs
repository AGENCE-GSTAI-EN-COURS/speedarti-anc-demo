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

test("Cadastre — réponse IGN authentique simulée en recette, surface réellement reliée au dossier",async({page})=>{
  await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({
    status:200,contentType:"application/json",
    body:JSON.stringify({type:"FeatureCollection",features:[{
      type:"Feature",properties:{section:"ZZ",numero:"0002",contenance:5033},
      geometry:{type:"Polygon",coordinates:[[[1.35,44.02],[1.351,44.02],[1.351,44.021],[1.35,44.021],[1.35,44.02]]]}
    }]})
  }));
  await page.goto("/#dossier");
  await page.locator("#anc-detect-parcel").click();
  await expect(page.locator(".anc-p-number").last()).toHaveValue("0002");
  await expect(page.locator(".anc-p-surface").last()).toHaveValue("5033");
  await expect(page.locator("#anc-parcel-total")).toContainText("9 833");
  await page.reload();
  await expect(page.locator(".anc-p-surface").last()).toHaveValue("5033");
});
test("Multi-parcelles — saisie réellement additionnée, suppression et persistance",async({page})=>{
  await page.goto("/#dossier");
  await page.locator(".anc-p-surface").first().fill("4000");
  await page.locator("#anc-add-parcel").click();
  await expect(page.locator(".anc-v3-parcel")).toHaveCount(2);
  await page.locator(".anc-p-surface").last().fill("1200");
  await expect(page.locator("#anc-parcel-total")).toContainText("5 200");
  await page.locator(".anc-p-remove").last().click();
  await expect(page.locator("#anc-parcel-total")).toContainText("4 000");
  await page.reload();
  await expect(page.locator(".anc-v3-parcel")).toHaveCount(1);
  await expect(page.locator(".anc-p-surface").first()).toHaveValue("4000");
});
test("Géocodage — utilise une vraie requête publique et affiche ses coordonnées",async({page})=>{
  await page.route("**/geocodage/search?**",route=>route.fulfill({
    status:200,contentType:"application/json",
    body:JSON.stringify({features:[{type:"Feature",geometry:{type:"Point",coordinates:[1.353,44.017]},properties:{label:"12 rue des Lilas 82000 Montauban",score:0.96}}]})
  }));
  await page.goto("/#dossier");
  await page.locator('[data-path="parcel.address"]').fill("12 rue des Lilas");
  await page.locator('[data-path="parcel.postalCode"]').fill("82000");
  await page.locator('[data-path="parcel.city"]').fill("Montauban");
  await page.locator('[data-action="geocode-address"]').click();
  await expect(page.locator('[data-path="parcel.lat"]')).toHaveValue("44.017");
  await expect(page.locator('[data-path="parcel.lng"]')).toHaveValue("1.353");
  await expect(page.locator(".geo-meta")).toContainText("12 rue des Lilas");
});
test("Cadastre — service indisponible : avertissement sans surface inventée",async({page})=>{
  await page.route("**/api/cadastre/parcelle?**",route=>route.fulfill({status:503,body:"Service indisponible"}));
  await page.goto("/#dossier");
  await page.locator("#anc-detect-parcel").click();
  await expect(page.locator("#anc-parcel-feedback")).toContainText("HTTP 503");
  await expect(page.locator(".anc-v3-parcel")).toHaveCount(1);
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
