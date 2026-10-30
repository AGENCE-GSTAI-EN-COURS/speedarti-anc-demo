import { test, expect } from "@playwright/test";

test("la démo publique fonctionne sans erreur JavaScript", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#title-overview")).toBeVisible();
  await expect(page.locator(".alert")).toContainText("aucun calcul ANC réel");
  await expect(page.locator(".feature-card")).toHaveCount(6);
  expect(errors).toEqual([]);
});

test("la navigation fonctionne sur tous les écrans", async ({ page }) => {
  await page.goto("/");
  for (const slug of ["dossier","soil","porchet","plan","infiltration","report","angel"]) {
    await page.locator('.nav-link[data-target="' + slug + '"]').click();
    await expect(page.locator("#page-" + slug)).toBeVisible();
  }
});

test("les scénarios préremplis changent sans calcul", async ({ page }) => {
  await page.goto("/#/infiltration");
  await page.locator("#scenario-select").selectOption("constrained");
  await expect(page.locator("#stat-k")).toHaveText("9 mm/h");
  await expect(page.locator("#stat-area")).toHaveText("À réévaluer");
  await expect(page.locator("#scenario-warning")).toContainText("professionnel");
});

test("la fiche dossier met à jour le spécimen uniquement", async ({ page }) => {
  await page.goto("/#/dossier");
  await page.locator("#field-reference").fill("DEMO-EXEMPLE-123");
  await page.locator("#field-project").fill("Projet fictif");
  await page.locator("#demo-save").click();
  await expect(page.locator("#save-feedback")).toContainText("cette visite");
  await page.locator('.nav-link[data-target="report"]').click();
  await expect(page.locator("#report-reference")).toHaveText("DEMO-EXEMPLE-123");
  await expect(page.locator("#report-project")).toHaveText("Projet fictif");
  await expect(page.locator(".report-watermark")).toHaveText("SPÉCIMEN");
});

test("Ángel répond uniquement avec des phrases simulées", async ({ page }) => {
  await page.goto("/#/angel");
  await page.locator("#chat-input").fill("Porchet");
  await page.locator("#chat-form button[type=submit]").click();
  await expect(page.locator(".bubble.user")).toHaveCount(1);
  await expect(page.locator(".bubble.assistant")).toHaveCount(2);
  await expect(page.locator(".bubble.assistant").last()).toContainText("Aucune formule");
});

test("le plan schématique permet d'afficher et masquer les tranchées", async ({ page }) => {
  await page.goto("/#/plan");
  await expect(page.locator("#plan-trenches")).toBeVisible();
  await page.locator("#show-trenches").uncheck();
  await expect(page.locator("#plan-trenches")).toBeHidden();
});
