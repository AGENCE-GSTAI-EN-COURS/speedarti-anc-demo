import {test,expect} from "@playwright/test";

async function locatedDossier(page){
 await page.goto("/#dossier");
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 await page.locator("details.geo-advanced summary").click();
 await page.locator('[data-path="parcel.lat"]').fill("44.0200");
 await page.locator('[data-path="parcel.lng"]').fill("1.3500");
 await page.locator('#public-tabs [data-tab="geometrie"]').click();
 await expect(page.locator(".anc-real-map-card .leaflet-container")).toBeVisible({timeout:16000});
}

test("14 vues et 7 couches retrouvées, avec filtres combinables et opacité mobile/PC",async({page})=>{
 await locatedDossier(page);
 await expect(page.locator("#geometrie .anc-map-presets [data-anc-map-view]")).toHaveCount(14);
 await expect(page.locator("#geometrie [data-anc-overlay]")).toHaveCount(7);
 await page.locator('[data-anc-map-view="environment"]').first().click();
 await expect(page.locator('#geometrie [data-anc-map-view="environment"]')).toHaveAttribute("aria-pressed","true");
 await expect(page.locator('[data-anc-overlay="argiles"]')).toBeChecked();
 await expect(page.locator('[data-anc-overlay="cavites"]')).toBeChecked();
 await page.locator('#anc-map-base').selectOption("aerial");
 await page.locator('[data-anc-overlay="cadastre"]').check();
 await page.locator('[data-anc-overlay="geology"]').check();
 await page.locator('[data-anc-opacity="geology"]').evaluate(el=>{
   el.value="35";el.dispatchEvent(new Event("change",{bubbles:true}));
 });
 await expect(page.locator('[data-anc-opacity="geology"]')).toHaveValue("35");
 const state=await page.evaluate(()=>window.ANCRealWorkflow.getStudy().mapView);
 expect(state.activeKind).toBe("environment");
 expect(state.base).toBe("aerial");
 expect(state.overlays).toContain("geology");
 expect(state.overlays).toContain("cadastre");
 expect(state.opacity.geology).toBeCloseTo(.35,2);
});

test("Enregistrement réel : filtres + fond + coordonnées + cadrage, galerie persistante et réouverture",async({page})=>{
 await locatedDossier(page);
 await page.locator('[data-anc-map-view="geology"]').first().click();
 await page.locator('#anc-map-base').selectOption("aerial");
 await page.locator('[data-anc-overlay="cadastre"]').check();
 await page.locator('[data-anc-opacity="geology"]').evaluate(el=>{
   el.value="45";el.dispatchEvent(new Event("change",{bubbles:true}));
 });
 await page.locator('[data-anc-map-save="1"]').click();
 await expect(page.locator("#anc-map-save-result")).toContainText("enregistré");
 await expect(page.locator("#anc-map-save-result")).toHaveAttribute("data-status","success");
 const saved=await page.evaluate(()=>window.ANCRealWorkflow.getStudy().maps.at(-1));
 expect(saved.id).toMatch(/^anc_map_/);
 expect(saved.kind).toBe("geology");
 expect(saved.base).toBe("aerial");
 expect(saved.overlays).toEqual(expect.arrayContaining(["geology","cadastre"]));
 expect(saved.opacity.geology).toBeCloseTo(.45,2);
 expect(saved.bounds).toHaveLength(4);
 expect(saved.center).toHaveLength(2);
 expect(saved.studyId).toBeTruthy();
 expect(saved.imageArchived).toBe(false);
 await page.locator('[data-anc-map-open-gallery]').click();
 await expect(page.locator("#anc-live-map-gallery")).toContainText("Géologie BRGM");
 await expect(page.locator("#anc-gallery-count")).toContainText("1 composition");
 await expect(page.locator(".anc-saved-map-details")).toContainText("Photographies aériennes");
 await expect(page.locator(".anc-saved-map-details")).toContainText("Parcelles cadastrales");
 await page.reload();
 await expect(page.locator("#anc-gallery-count")).toContainText("1 composition");
 await expect(page.locator('[data-anc-reopen-map]')).toHaveCount(1);
 await page.locator('[data-anc-reopen-map]').click();
 await expect(page.locator("#geometrie [data-anc-map-view='geology']")).toHaveAttribute("aria-pressed","true");
 await expect(page.locator("#anc-map-base")).toHaveValue("aerial");
 await expect(page.locator('[data-anc-overlay="cadastre"]')).toBeChecked();
 await expect(page.locator('[data-anc-opacity="geology"]')).toHaveValue("45");
 const mapCenter=await page.evaluate(()=>window.ANCRealWorkflow.getStudy().mapView.center);
 expect(mapCenter).toEqual(saved.center);
 await page.locator('[data-anc-map-view="cadastre"]').first().click();
 await page.locator('[data-anc-map-save="1"]').click();
 await expect(page.locator("#anc-map-save-result")).toContainText("2 cartes");
 await page.locator('[data-anc-map-open-gallery]').click();
 await expect(page.locator("#anc-gallery-count")).toContainText("2 composition");
 await expect(page.locator("#anc-live-map-gallery")).toContainText("Plan cadastral");
 await page.locator('[data-anc-remove-map]').first().click();
 await expect(page.locator("#anc-gallery-count")).toContainText("1 composition");
});

test("Vue inondation : message clair, ne pas inventer une couche de risque",async({page})=>{
 await locatedDossier(page);
 await page.locator('[data-anc-map-view="flood"]').first().click();
 await expect(page.locator("#anc-map-view-note")).toContainText("Aucune couche locale d’inondation");
 await expect(page.locator('[data-anc-overlay="cadastre"]')).not.toBeChecked();
});

test("Enregistrement d'une vue sans parcelle : sauvegarde provisoire et non validée",async({page})=>{
 await page.goto("/#geometrie");
 await expect(page.locator(".anc-real-map-card .leaflet-container")).toBeVisible({timeout:16000});
 await page.locator('[data-anc-map-view="situation"]').first().click();
 await page.locator('[data-anc-map-save="1"]').click();
 await expect(page.locator("#anc-map-save-result")).toContainText("enregistré");
 const last=await page.evaluate(()=>window.ANCRealWorkflow.getStudy().maps.at(-1));
 expect(last.status).toBe("TO_LOCALIZE");
 await page.locator('[data-anc-map-open-gallery]').click();
 await expect(page.locator("#anc-live-map-gallery")).toContainText("à rattacher");
});

test("Plans conservés par dossier, hors données des autres clients",async({page})=>{
 await locatedDossier(page);
 await page.locator('[data-anc-map-save="1"]').click();
 await expect(page.locator("#anc-map-save-result")).toContainText("enregistré");
 const firstId=await page.evaluate(()=>window.ANCRealWorkflow.getStudy().id);
 await page.locator("#public-tabs [data-tab='dossier']").click();
 await page.locator('#anc-dossier-client-actions [data-live-action="new-study"]').click();
 const secondId=await page.evaluate(()=>window.ANCRealWorkflow.getStudy().id);
 expect(secondId).not.toBe(firstId);
 await page.locator("#public-tabs [data-tab='cartes']").click();
 await expect(page.locator("#anc-live-map-gallery")).toContainText("Aucune carte enregistrée");
});

test("Annexe rapport : composition de risque sauvegardée puis reprise comme annexe supplémentaire",async({page})=>{
 await locatedDossier(page);
 await page.locator('[data-anc-map-view="groundwater"]').first().click();
 await page.locator('[data-anc-map-save="1"]').click();
 await page.locator("#public-tabs [data-tab='rapport']").click();
 await expect(page.locator('#report-pages [data-anc-chapter="map-groundwater"]')).toBeVisible();
 await expect(page.locator('#report-pages [data-anc-chapter="map-groundwater"]')).toContainText("nappe-sedim");
 await expect(page.locator('#report-pages [data-anc-chapter="map-groundwater"]')).toContainText("cadrage");
});


test("Résilience : une erreur cadastrale n'empêche plus l'affichage du panneau terrain ANC",async({page})=>{
 await page.goto("/#dossier");
 await expect(page.locator("#anc-available-estimator summary")).toBeVisible();
 await page.evaluate(()=>{
   window.ANCGeoParcel.mount=()=>{throw Error("Défaillance injectée dans le module cartographique");};
 });
 await page.locator('#public-tabs [data-tab="terrain"]').click();
 await page.locator('#public-tabs [data-tab="dossier"]').click();
 await expect(page.locator("#anc-available-estimator summary")).toBeVisible({timeout:12000});
 const error=await page.evaluate(()=>window.__ancMountError);
 expect(error?.message).toContain("Défaillance injectée");
});
