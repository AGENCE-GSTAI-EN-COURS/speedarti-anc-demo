import {test,expect} from "@playwright/test";

test("Présentation Fred : couverture lisible, titre double ligne, photo, tableau vert et sommaire pleine page",async({page})=>{
 await page.goto("/#rapport");
 const pages=page.locator("#report-pages>.a4");
 expect(await pages.count()).toBeGreaterThanOrEqual(29);
 const cover=pages.filter({has:page.locator('[data-anc-chapter="couverture"]')});
 const first=page.locator('#report-pages [data-anc-chapter="couverture"]');
 await expect(first).toBeVisible();
 await expect(first.locator(".anc-fred-cover-top")).toBeVisible();
 await expect(first.locator(".anc-fred-cover-client")).toBeVisible();
 await expect(first.locator(".anc-fred-cover-photo")).toBeVisible();
 await expect(first).toContainText("RAPPORT D’ÉTUDE DE CONCEPTION");
 await expect(first).not.toContainText("NILSSON Anna");
 await expect(first).not.toContainText("1814 route d'Agen");
 const toc=page.locator('#report-pages [data-anc-chapter="sommaire"]');
 await expect(toc).toBeVisible();
 await expect(toc.locator(".anc-fred-toc-row").first()).toBeVisible();
 expect(await toc.locator(".anc-fred-toc-row").count()).toBeGreaterThanOrEqual(29);
 expect(await toc.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe("rgb(155, 221, 101)");
 await expect(page.locator('#report-pages [data-anc-chapter="parcelles"] table')).toBeVisible();
 const firstHeader=page.locator('#report-pages [data-anc-chapter="parcelles"] th').first();
 const bg=await firstHeader.evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(bg).not.toBe("rgba(0, 0, 0, 0)");
 await expect(page.locator("#anc-report-page-counter")).toContainText("pages A4");
});

test("Photo de couverture : ajout local rattaché uniquement au dossier courant, persiste après rechargement",async({page})=>{
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator('[data-path="owner.lastName"]').fill("PHOTO-TEST-ANC");
 await page.locator('#public-tabs [data-tab="rapport"]').click();
 await expect(page.locator(".anc-fred-cover-photo.empty")).toBeVisible();
 const onePixelPng=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/b3cAAAAASUVORK5CYII=","base64");
 await page.locator("#anc-report-cover-photo").setInputFiles({name:"site.png",mimeType:"image/png",buffer:onePixelPng});
 await expect(page.locator('.anc-fred-cover-photo img')).toHaveAttribute("src",/^data:image\/jpeg;base64,/,{timeout:15000});
 await page.reload();
 await expect(page.locator('.anc-fred-cover-photo img')).toBeVisible();
 await expect(page.locator('#report-pages [data-anc-chapter="couverture"]')).toContainText("PHOTO-TEST-ANC");
 await page.locator('#public-tabs [data-tab="dossier"]').click();
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator('#public-tabs [data-tab="rapport"]').click();
 await expect(page.locator(".anc-fred-cover-photo.empty")).toBeVisible();
});

test("Impression A4 : pages visibles et vert de sommaire conservé",async({page})=>{
 await page.goto("/#rapport");
 await page.emulateMedia({media:"print"});
 const pages=page.locator("#report-pages>.a4");
 const count=await pages.count();
 expect(count).toBeGreaterThanOrEqual(29);
 expect(await pages.evaluateAll(items=>items.every(x=>getComputedStyle(x).display!=="none"))).toBe(true);
 expect(await page.locator('#report-pages [data-anc-chapter="sommaire"]').evaluate(x=>getComputedStyle(x).backgroundColor)).toBe("rgb(155, 221, 101)");
 const r=await pages.first().evaluate(x=>getComputedStyle(x).breakAfter);
 expect(["page","always"]).toContain(r);
});

test("Export Word .doc : inclut la structure couleur et les annexes, mais aucune donnée de Fred",async({page})=>{
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator('[data-path="owner.lastName"]').fill("DEMO-WORD");
 await page.locator('#public-tabs [data-tab="rapport"]').click();
 const download=page.waitForEvent("download");
 await page.locator('[data-action="export-word"]').click();
 const file=await download;
 expect(file.suggestedFilename()).toMatch(/^ANC_.*\.doc$/);
 const stream=await file.createReadStream(),chunks=[];
 for await(const chunk of stream)chunks.push(chunk);
 const html=Buffer.concat(chunks).toString("utf8");
 expect(html).toContain("#9bdd65");
 expect(html).toContain("anc-fred-cover-photo");
 expect(html).toContain("DEMO-WORD");
 expect(html).toContain("Annexe");
 expect(html).not.toContain("1814 route d'Agen");
});
