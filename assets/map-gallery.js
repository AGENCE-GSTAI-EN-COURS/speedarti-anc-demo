/* Cartes ANC enregistrées : compositions persistantes par dossier.
 * Une composition conserve fonds/couches/cadrage même si l'aperçu WMS distant est indisponible.
 * Ce n'est pas une image figée certifiée ou un plan réglementaire validé.
 */
(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=x=>String(x??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[a]));
const labels={
 situation:"Plan de situation",cadastre:"Plan cadastral",aerial:"Vue aérienne",
 flood:"Risques d’inondation",groundwater:"Remontée de nappe",environment:"Contraintes environnementales",
 geology:"Géologie BRGM",investigation:"Sondages / Porchet",implantation:"Implantation ANC",
 trenches:"Tranchées d’infiltration",networks:"Réseaux existants",
 evacuation:"Évacuation / exutoire",works:"Travaux / terrassement",synthesis:"Synthèse ANC"
};
function mount(section){
 if(section?.id!=="cartes")return;
 const st=window.ANCRealWorkflow?.getStudy?.(),maps=Array.isArray(st?.maps)?st.maps:[];
 $("#anc-live-map-gallery",section)?.remove();
 const panel=document.createElement("article");panel.className="card";panel.id="anc-live-map-gallery";
 panel.innerHTML='<header class="card-head"><div><h2>Cartes enregistrées dans le dossier</h2>'+
 '<p>Vos compositions sauvegardent le fond, les couches, leur opacité et le cadrage. Vous pouvez les rouvrir et les modifier ; les images distantes restent à vérifier avant le rapport final.</p></div></header>'+
 '<div class="card-body"><p id="anc-gallery-count" class="notice info">'+maps.length+' composition(s) enregistrée(s) dans le dossier actuel.</p>'+
 '<div class="anc-gallery-grid"></div></div>';
 const gallery=$(".anc-gallery-grid",panel);
 if(!maps.length)gallery.innerHTML='<div class="notice warn">Aucune carte enregistrée. Ouvrez Plan & métrés, choisissez vos filtres puis cliquez sur « Enregistrer cette carte dans le dossier ».</div>';
 for(const item of maps){
   const card=document.createElement("article");card.className="map-card anc-saved-map-card";
   card.dataset.ancSavedMapId=item.id||item.kind;
   const h=document.createElement("h3");h.textContent=item.label||labels[item.kind]||item.kind;card.append(h);
   if(item.url&&/^https:\/\//.test(item.url)){
     const img=document.createElement("img");img.src=item.url;img.alt="Aperçu distant : "+h.textContent;
     img.loading="lazy";img.style.cssText="max-width:100%;min-height:100px;max-height:240px;object-fit:contain;background:#f1f7fb";
     img.addEventListener("error",()=>{
       img.replaceWith(Object.assign(document.createElement("p"),{className:"notice warn",
         textContent:"Aperçu distant indisponible, mais votre composition reste sauvegardée et peut être rouverte."}));
     });
     card.append(img);
   }
   const details=document.createElement("dl");details.className="anc-saved-map-details";
   const overlayNames=(item.overlays||[]).map(id=>
     window.ANCMapRuntime?.definitions?.overlays?.find(x=>x.id===id)?.label||id);
   const baseName=window.ANCMapRuntime?.definitions?.bases?.find(x=>x.id===item.base)?.label||item.base||"Plan de référence";
   for(const [label,value] of [
     ["Fond",baseName],["Filtres",overlayNames.length?overlayNames.join(", "):"Aucun filtre"],
     ["Coordonnées/cadrage",Array.isArray(item.center)?item.center.map(n=>Number(n).toFixed(5)).join(", "):"À localiser"],
     ["Parcelle",item.parcelReference||"Non confirmée"],
     ["Date",item.savedAt?new Date(item.savedAt).toLocaleString("fr-FR"):"Inconnue"],
     ["Statut",item.status==="TO_LOCALIZE"?"Vue à rattacher à une parcelle":"À confirmer professionnellement"]
   ]){
     const dt=document.createElement("dt");dt.textContent=label;
     const dd=document.createElement("dd");dd.textContent=value;details.append(dt,dd);
   }
   card.append(details);
   const note=document.createElement("p");note.className="anc-source-note";
   note.textContent="Composition enregistrée dans ce navigateur. Aperçu connecté au fournisseur, non figé et non certifié.";card.append(note);
   const actions=document.createElement("div");actions.className="anc-map-card-actions";
   const reopen=document.createElement("button");reopen.type="button";reopen.className="btn primary small";
   reopen.dataset.ancReopenMap=item.id||item.kind;reopen.textContent="Rouvrir / modifier dans Plan & métrés";
   const remove=document.createElement("button");remove.type="button";remove.className="btn secondary small";
   remove.dataset.ancRemoveMap=item.id||item.kind;remove.textContent="Retirer cette carte";
   actions.append(reopen,remove);card.append(actions);
   gallery.append(card);
 }
 section.querySelector(".section-head")?.insertAdjacentElement("afterend",panel);
 for(const old of $$(".map-card",section))if(!panel.contains(old))old.hidden=true;
}
function handle(event){
 const button=event.target.closest("button");
 if(!button)return false;
 const key=button.dataset.ancReopenMap;
 if(key!==undefined){
   const s=window.ANCRealWorkflow?.getStudy?.();
   const saved=(s?.maps||[]).find(m=>m.id===key)|| (s?.maps||[]).find(m=>m.kind===key);
   if(!saved)return true;
   window.ANCRealWorkflow?.mutateStudy?.(st=>{
     if(st.id!==s.id)return;
     st.mapView={...(st.mapView||{}),activeKind:saved.kind,
       base:saved.base||"aerial",overlays:saved.overlays||[],opacity:saved.opacity||{},
       center:saved.center,zoom:saved.zoom,bounds:saved.bounds};
   });
   window.ANCPublicNavigate?.("geometrie");
   return true;
 }
 const remove=button.dataset.ancRemoveMap;
 if(remove!==undefined){
   window.ANCRealWorkflow?.mutateStudy?.(st=>{
     st.maps=(st.maps||[]).filter(m=>(m.id||m.kind)!==remove);
   });
   mount($("#cartes"));return true;
 }
 return false;
}
window.ANCMapGallery={mount,handle};
})();