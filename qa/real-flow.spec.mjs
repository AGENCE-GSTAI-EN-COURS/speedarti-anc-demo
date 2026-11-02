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


test("Plan ANC: tracer une tranchée, mesurer et retrouver la longueur dans le rapport",async({page})=>{
  await page.goto("/#geometrie");
  await expect(page.locator("#live-plan")).toBeVisible();
  const svg=page.locator(".live-plan-svg");
  await page.locator('[data-live-plan="trench"]').click();
  const box=await svg.boundingBox();
  await svg.click({position:{x:box.width*0.2,y:box.height*0.5}});
  await svg.click({position:{x:box.width*0.6,y:box.height*0.5}});
  await expect(page.locator(".live-plan-svg polyline")).toHaveCount(1);
  const summary=await page.locator(".live-plan-summary").innerText();
  const matched=summary.match(/Longueur dessinée : ([\d,]+)/);
  expect(matched).not.toBeNull();
  const distance=Number(matched[1].replace(",","."));
  expect(distance).toBeGreaterThan(31);
  expect(distance).toBeLessThan(33);
  await page.locator('#public-tabs [data-tab="rapport"]').click();
  await expect(page.locator("#axis-report-page")).toContainText(distance.toFixed(2)+" m");
  await page.reload();
  await expect(page.locator("#axis-report-page")).toContainText(distance.toFixed(2)+" m");
});
test("Plan ANC: maison et annulation du dernier point",async({page})=>{
  await page.goto("/#geometrie");
  const svg=page.locator(".live-plan-svg");
  await page.locator('[data-live-plan="house"]').click();
  await svg.click({position:{x:200,y:180}});
  await expect(svg.getByText("Maison")).toBeVisible();
  await page.locator('[data-live-plan="trench"]').click();
  const box=await svg.boundingBox();
  await svg.click({position:{x:box.width*0.2,y:box.height*0.5}});
  await svg.click({position:{x:box.width*0.6,y:box.height*0.5}});
  await expect(svg.locator("circle")).toHaveCount(2);
  await page.locator('[data-live-plan="undo"]').click();
  await expect(svg.locator("circle")).toHaveCount(1);
});


test("Contrôles — les informations du dossier font changer les indicateurs",async({page})=>{
  await page.goto("/#controles");
  await expect(page.locator("#live-control-panel")).toBeVisible();
  await expect(page.locator("#live-control-panel")).toContainText("À COMPLÉTER");
  await page.locator('#public-tabs [data-tab="dossier"]').click();
  await page.locator('[data-path="owner.lastName"]').fill("MARTIN");
  await page.locator('#public-tabs [data-tab="controles"]').click();
  const client=page.locator("#live-control-panel .live-check-row").filter({hasText:"Client identifié"});
  await expect(client).toContainText("RENSEIGNÉ");
});
test("Autotests publics — résultats de vrais contrôles et non statistique figée",async({page})=>{
  await page.goto("/#tests");
  await page.locator('[data-action="run-self-tests"]').click();
  await expect(page.locator(".live-test-results")).toContainText("5/5");
  await expect(page.locator(".live-test-results")).toContainText("Enregistrement local");
  await expect(page.locator(".live-test-results")).toContainText("Dossier actif");
});
test("Automatisation — bouton ouvre rapport mis à jour, sans faux EH",async({page})=>{
  await page.goto("/#automatisation");
  await expect(page.locator(".live-auto-summary")).toContainText("Les règles de dimensionnement");
  await page.locator('#automatisation [data-action="generate"]').click();
  await expect(page.locator("#axis-report-page")).toBeVisible();
});
