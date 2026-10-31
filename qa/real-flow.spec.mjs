import {test,expect} from "@playwright/test";

test("Parcours réel: dossier → Porchet Excel → rapport avec les données saisies", async ({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/#dossier");
  await expect(page.locator("#dossier")).toBeVisible();
  await page.locator('[data-path="title"]').fill("Étude réelle de démonstration");
  await page.locator('[data-path="reference"]').fill("TEST-FRED-001");
  await page.locator('[data-path="owner.firstName"]').fill("Camille");
  await page.locator('[data-path="owner.lastName"]').fill("Dupont");
  await page.locator('[data-path="parcel.city"]').fill("Caussade");
  await page.locator('#public-tabs [data-tab="porchet"]').click();
  await page.locator("#porchet [data-px-tab='KP1']").click();
  await page.locator('#porchet [data-px-field="diameter"]').fill("150");
  await page.locator('#porchet [data-px-field="height"]').fill("150");
  await page.locator('#porchet [data-px-grad="0"]').fill("1180");
  await page.locator('#porchet [data-px-grad="1"]').fill("1173");
  await expect(page.locator("#porchet .px-total")).toContainText("7,453");
  await page.locator('#public-tabs [data-tab="rapport"]').click();
  await expect(page.locator("#axis-report-page")).toContainText("TEST-FRED-001");
  await expect(page.locator("#axis-report-page")).toContainText("Camille Dupont");
  await expect(page.locator("#axis-report-page")).toContainText("Caussade");
  await expect(page.locator("#axis-report-page")).toContainText("7.453");
  expect(errors).toEqual([]);
});

test("Rechargement: le dossier saisi et le résultat Porchet restent liés",async({page})=>{
  await page.goto("/#dossier");
  await page.locator('[data-path="title"]').fill("Étude à conserver");
  await page.locator('[data-path="parcel.city"]').fill("Montauban");
  await page.locator('#public-tabs [data-tab="porchet"]').click();
  await page.locator('#porchet [data-px-field="diameter"]').fill("150");
  await page.locator('#porchet [data-px-field="height"]').fill("150");
  await page.locator('#porchet [data-px-grad="0"]').fill("1180");
  await page.locator('#porchet [data-px-grad="1"]').fill("1173");
  await page.locator('#public-tabs [data-tab="rapport"]').click();
  await page.reload();
  await expect(page.locator("#axis-report-page")).toContainText("Étude à conserver");
  await expect(page.locator("#axis-report-page")).toContainText("Montauban");
  await expect(page.locator("#axis-report-page")).toContainText("7.453");
  await page.locator('#public-tabs [data-tab="dossier"]').click();
  await expect(page.locator('[data-path="parcel.city"]')).toHaveValue("Montauban");
});

test("Nouvelles études: créer un dossier réellement indépendant",async({page})=>{
  await page.goto("/#etudes");
  await expect(page.locator("#live-studies")).toBeVisible();
  await page.locator('#public-tabs [data-tab="dossier"]').click();
  await page.locator('[data-path="title"]').fill("Ancien dossier");
  await page.locator('#public-tabs [data-tab="etudes"]').click();
  await page.locator('#live-studies [data-live-action="new-study"]').click();
  await expect(page.locator("#dossier")).toBeVisible();
  await page.locator('[data-path="title"]').fill("Nouveau dossier");
  await page.locator('#public-tabs [data-tab="etudes"]').click();
  await expect(page.locator("#live-studies .live-study-row")).toHaveCount(2);
  await expect(page.locator("#live-studies")).toContainText("Ancien dossier");
  await expect(page.locator("#live-studies")).toContainText("Nouveau dossier");
});

test("Créer un client et le réutiliser dans le dossier",async({page})=>{
  await page.goto("/#clients");
  await expect(page.locator("#live-clients")).toBeVisible();
  await page.locator('#live-clients [data-live-client="firstName"]').fill("Julie");
  await page.locator('#live-clients [data-live-client="lastName"]').fill("Martin");
  await page.locator('#live-clients [data-live-client="city"]').fill("Caussade");
  await page.locator('#live-clients [data-live-action="create-client"]').click();
  await expect(page.locator("#live-clients")).toContainText("Julie Martin");
  await page.locator('#live-clients [data-live-select-client]').click();
  await expect(page.locator("#dossier")).toBeVisible();
  await expect(page.locator('[data-path="owner.firstName"]')).toHaveValue("Julie");
  await expect(page.locator('[data-path="owner.lastName"]')).toHaveValue("Martin");
  await expect(page.locator('[data-path="parcel.city"]')).toHaveValue("Caussade");
});

test("Sondages: les modifications se retrouvent dans le rapport",async({page})=>{
  await page.goto("/#sondages");
  await expect(page.locator("#sondages .item-card").first()).toBeVisible();
  await page.locator('#sondages [data-path="boreholes.0.label"]').fill("Sondage Fred");
  await page.locator('#sondages [data-path="boreholes.0.depth"]').fill("150");
  await page.locator('#public-tabs [data-tab="rapport"]').click();
  await expect(page.locator("#axis-report-page")).toContainText("Sondage Fred");
  await expect(page.locator("#axis-report-page")).toContainText("150 cm");
});
