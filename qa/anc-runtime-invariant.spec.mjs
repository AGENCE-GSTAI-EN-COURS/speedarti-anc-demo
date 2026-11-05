import {test,expect} from "@playwright/test";
test("Initialisation ANC Dossier — aucune exception masquée",async({page})=>{
 const errors=[];page.on("pageerror",err=>errors.push(err.message));
 await page.goto("/#dossier");
 await page.locator("#dossier").waitFor();
 const state=await page.evaluate(()=>({
   hasWorkflow:typeof window.ANCRealWorkflow?.mount,
   hasGeo:typeof window.ANCGeoParcel?.mount,
   error:window.__ancMountError||null,
   controls:!!document.querySelector("#anc-dossier-client-actions"),
   length:document.querySelector("#dossier")?.children.length,
   firstNode:document.querySelector("#dossier")?.firstElementChild?.outerHTML?.slice(0,80)
 }));
 console.log("ANC_RUNTIME_AUDIT",JSON.stringify({state,errors}));
 expect(state.error).toBeNull();
 expect(state.controls).toBe(true);
});
