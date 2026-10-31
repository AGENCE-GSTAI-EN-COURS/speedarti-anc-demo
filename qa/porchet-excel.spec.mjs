import {test,expect} from "@playwright/test";

test("Porchet Fred — modèle identique au tableur avec 5 onglets",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/#porchet");
  await expect(page.locator("#porchet .px-tab")).toHaveCount(5);
  await page.locator('#porchet [data-px-tab="Exemple"]').click();
  await expect(page.locator("#porchet .px-result")).toContainText("7,34");
  await expect(page.locator("#porchet .px-table tbody tr")).toHaveCount(12);
  expect(errors).toEqual([]);
});

test("Porchet Fred — relevés jaunes calculés immédiatement, sauvegardés en public",async({page})=>{
  await page.goto("/#porchet");
  await page.locator('#porchet [data-px-tab="KP1"]').click();
  await page.locator('#porchet [data-px-field="diameter"]').fill("150");
  await page.locator('#porchet [data-px-field="height"]').fill("150");
  await page.locator('#porchet [data-px-grad="0"]').fill("1180");
  await page.locator('#porchet [data-px-grad="1"]').fill("1173");
  await expect(page.locator("#porchet .px-total")).toContainText("7,453");
  await expect(page.locator("#porchet [data-px-save]")).toContainText("Enregistré");
  await page.reload();
  await page.locator('#porchet [data-px-tab="KP1"]').click();
  await expect(page.locator('#porchet [data-px-grad="1"]')).toHaveValue("1173");
  await page.locator('[data-public-action="reset"]').click();
  await page.locator('.tab[data-tab="porchet"]').click();
  await expect(page.locator('#porchet [data-px-grad="1"]')).toHaveValue("");
});
