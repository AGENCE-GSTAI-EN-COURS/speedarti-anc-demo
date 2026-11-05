/* Galerie des cartes enregistrées par dossier — aucune image fictive. */
(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const labels={situation:"Plan de situation",cadastre:"Plan cadastral",aerial:"Vue aérienne",geology:"Carte géologique BRGM",implantation:"Implantation ANC"};
const enc=x=>String(x??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[a]));
function mount(section){
 if(section?.id!=="cartes")return;
 const st=window.ANCRealWorkflow?.getStudy?.(),maps=Array.isArray(st?.maps)?st.maps:[];
 const existing=$("#anc-live-map-gallery",section);if(existing)existing.remove();
 const panel=document.createElement("article");panel.className="card";panel.id="anc-live-map-gallery";
 panel.innerHTML='<header class="card-head"><div><h2>Cartes du dossier enregistrées</h2><p>Ces aperçus proviennent des services officiels IGN/BRGM. Les captures doivent être vérifiées avant inclusion dans le rapport ; une indisponibilité réseau reste signalée.</p></div></header><div class="card-body"><div class="anc-gallery-grid"></div></div>';
 const gallery=$(".anc-gallery-grid",panel);
 if(!maps.length)gallery.innerHTML='<div class="notice warn">Aucune carte enregistrée. Ouvrez Plans & métrés, choisissez une vue, puis cliquez sur Enregistrer cette vue.</div>';
 for(const item of maps){
   const card=document.createElement("article");card.className="map-card";
   const h=document.createElement("h3");h.textContent=labels[item.kind]||item.kind;card.append(h);
   const img=document.createElement("img");img.src=item.url;img.alt="Aperçu "+h.textContent;img.loading="lazy";img.style.cssText="max-width:100%;min-height:100px";
   img.addEventListener("error",()=>{img.replaceWith(Object.assign(document.createElement("p"),{textContent:"Fond cartographique indisponible : réessayer ou vérifier la source."}))});
   card.append(img);
   const p=document.createElement("p");p.className="small-text";p.textContent=(item.source||"Source à vérifier")+" — "+(item.savedAt||"")+" — À CONFIRMER";card.append(p);
   const remove=document.createElement("button");remove.className="btn secondary small";remove.type="button";remove.dataset.ancRemoveMap=item.kind;remove.textContent="Retirer cette carte";card.append(remove);
   gallery.append(card);
 }
 section.querySelector(".section-head")?.insertAdjacentElement("afterend",panel);
 for(const old of $$(".map-card",section)){if(!panel.contains(old))old.hidden=true;}
 const note=document.createElement("p");note.className="notice info";note.textContent="Organisation simplifiée : seules les cartes effectivement sauvegardées apparaissent ici. Les autres cartes restent disponibles dans l'éditeur, sur demande.";gallery.append(note);
}
function handle(event){
 const b=event.target.closest("[data-anc-remove-map]");if(!b)return false;
 window.ANCRealWorkflow?.mutateStudy?.(st=>{st.maps=(st.maps||[]).filter(m=>m.kind!==b.dataset.ancRemoveMap)});
 mount($("#cartes"));return true;
}
window.ANCMapGallery={mount,handle};
})();