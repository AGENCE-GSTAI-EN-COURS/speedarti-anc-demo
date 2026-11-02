/* SpeedArti ANC — contrôles de cohérence de saisie publics, sans règles
 * réglementaires confidentielles et sans inventer de résultats techniques. */
(()=>{
"use strict";
const $=(q,r=document)=>r.querySelector(q);
const $$=(q,r=document)=>Array.from(r.querySelectorAll(q));
const get=()=>window.ANCRealWorkflow?.getStudy?.();
const mutate=cb=>window.ANCRealWorkflow?.mutateStudy?.(cb);
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const numeric=v=>v!==null&&v!==undefined&&String(v).trim()!==""&&Number.isFinite(Number(String(v).replace(",",".")))?Number(String(v).replace(",",".")):null;
const notice=msg=>{
 const box=$("#public-toast");if(box){box.hidden=false;box.textContent=msg;}
};
function analyze(){
 const st=get(),f=st?.fields||{},checks=[];
 const add=(name,condition,advice)=>checks.push({name,ok:!!condition,advice});
 const client=(f["owner.lastName"]||"").trim();
 add("Client identifié",client.length>0,"Renseigner le nom du client dans Dossier.");
 add("Adresse du chantier",(f["parcel.address"]||"").trim().length>5&&!(f["parcel.city"]||"").includes("Démo"),"Renseigner une adresse réelle ou contrôler la localisation.");
 add("Commune",(f["parcel.city"]||"").trim().length>1&&!(f["parcel.city"]||"").includes("Démo"),"Renseigner la commune dans Dossier.");
 const area=(st?.parcels||[]).reduce((a,p)=>a+Math.max(0,numeric(p.area)||0),0);
 add("Surface parcellaire",area>0,"Renseigner la surface d'au moins une parcelle ; confirmer la source.");
 const lat=numeric(f["parcel.lat"]),lng=numeric(f["parcel.lng"]);
 add("Position GPS vérifiable",lat!==null&&lng!==null&&lat!==0&&lng!==0&&Math.abs(lat)<=90&&Math.abs(lng)<=180,"Localiser le chantier et vérifier ses coordonnées.");
 const bores=st?.cells?.sondages||[];
 add("Sondages enregistrés",bores.length>0,"Ajouter ou compléter au moins un sondage.");
 const parsed=(()=>{try{return JSON.parse(st?.porchet||"null")||{}}catch{return {}}})();
 const formula=window.ANCPorchetExcel?.calculate;
 const k=["KP1","KP2","KP3","KP4"].map(key=>{
   const sheet=parsed.sheets?.[key];if(!sheet||!formula)return null;
   try{return formula(sheet)}catch{return null}
 }).filter(Boolean);
 add("Essai Porchet exploitable",k.some(r=>r.complete&&r.mean!==null&&r.mean>0),"Renseigner la série complète des graduations dans KP1 à KP4 et vérifier les paramètres.");
 const plan=st?.plan;
 add("Plan de repérage local",!!plan?.house&&plan?.points?.length>=2,"Placer la maison et au moins deux points de tranchée dans Plan & métrés.");
 return {checks,complete:checks.filter(c=>c.ok).length,required:checks.length,ref:st?.name||"Dossier"};
}
function hideFake(section){
 for(const el of Array.from(section.children)){
   if(el.classList.contains("section-head")||el.classList.contains("s4-footer")||el.classList.contains("live-control-panel"))continue;
   el.style.display="none";
 }
}
function panel(section){
 if(section?.id!=="controles")return;
 hideFake(section);
 $("#live-control-panel",section)?.remove();
 const check=analyze();
 const card=document.createElement("article");
 card.id="live-control-panel";card.className="anc-v3-card live-control-panel";
 const failed=check.checks.filter(x=>!x.ok).length;
 card.innerHTML='<header><div><h2>Contrôles réels des données saisies</h2><p>Vérifications de complétude du dossier actif. Aucun calcul réglementaire ni conformité ANC n’est déduit de ces indicateurs.</p></div><button class="btn primary" type="button" data-live-control="refresh">Relancer les contrôles</button></header>'+
 '<div class="anc-v3-body"><div class="notice '+(failed?"warn":"info")+'">'+check.complete+'/'+check.required+' vérifications de complétude satisfaites · '+failed+' point(s) à compléter. La validation professionnelle reste obligatoire.</div>'+
 check.checks.map(c=>'<div class="live-check-row"><span>'+(c.ok?"✓":"⚠")+'</span><div><strong>'+e(c.name)+'</strong><small>'+e(c.ok?"Information enregistrée — à contrôler par Fred.":c.advice)+'</small></div><b>'+e(c.ok?"RENSEIGNÉ":"À COMPLÉTER")+'</b></div>').join("")+
 '<p class="anc-source-note">Les contrôles de conception, réglementations, distances et choix de filière ne sont pas disponibles sans moteur privé validé.</p></div>';
 const head=$(".section-head",section);
 if(head)head.insertAdjacentElement("afterend",card);else section.prepend(card);
}
function automation(section){
 if(section?.id!=="automatisation")return;
 $(".auto-flow",section)?.setAttribute("hidden","");
 $(".automation-grid",section)?.setAttribute("hidden","");
 const f=get()?.fields||{};
 const rooms=numeric(f["building.mainRooms"]);
 let html=$(".live-auto-summary",section);
 if(!html){
   html=document.createElement("div");html.className="notice info live-auto-summary";
   $(".section-head",section)?.insertAdjacentElement("afterend",html);
 }
 html.textContent="Synthèse du dossier actuel : "+e(get()?.name||"")+". "+
    (rooms===null?"Nombre de pièces principales à renseigner dans Dossier.":"Pièces principales saisies : "+rooms+".")+
    " Les règles de dimensionnement, les distances et le choix de filière ne sont pas calculés dans cette démo publique.";
 const header=section.querySelector('[data-action="generate"]');
 if(header)header.textContent="📄 Actualiser et voir mon rapport";
}
function rules(section){
 if(section?.id!=="regles")return;
 let n=$(".live-rule-info",section);
 if(!n){
   n=document.createElement("div");n.className="notice warn live-rule-info";
   n.textContent="Paramètres de démonstration modifiables et enregistrés, sans effet réglementaire automatique. Validation de Fred nécessaire avant l’application de ces règles.";
   $(".section-head",section)?.insertAdjacentElement("afterend",n);
 }
 const btn=section.querySelector('[data-action="apply-rules"]');
 if(btn)btn.textContent="Enregistrer les paramètres du dossier";
}
function testPage(section){
 if(section?.id!=="tests")return;
 $(".stats",section)?.setAttribute("hidden","");
 let n=$(".live-test-results",section);
 if(!n){
  n=document.createElement("article");n.className="anc-v3-card live-test-results";
  $(".section-head",section)?.insertAdjacentElement("afterend",n);
 }
 n.innerHTML='<header><div><h2>Autotests du navigateur</h2><p>La recette métier complète est vérifiée séparément dans le dépôt privé.</p></div></header><div class="anc-v3-body">Cliquer sur « Lancer les autotests » pour exécuter les vérifications du stockage local, des conversions et du dossier.</div>';
}
function runTests(){
 const checks=[];
 const add=(name,fn)=>{try{checks.push({name,ok:!!fn()})}catch{checks.push({name,ok:false})}};
 add("Enregistrement local",()=>{
   const key="anc_test_"+Date.now(),value="OK";
   localStorage.setItem(key,value);
   const pass=localStorage.getItem(key)===value;
   localStorage.removeItem(key);return pass;
 });
 add("Dossier actif",()=>!!get()?.id);
 add("Tableau Porchet et exemple",()=>{
   const engine=window.ANCPorchetExcel;
   return !!engine?.calculate&&Math.abs(engine.calculate(engine.example).mean-7.34263867945)<0.0001;
 });
 add("Géométries de surfaces en navigateur",()=>{
   const area=window.ANCGeoParcel?.geometryArea?.({type:"Polygon",coordinates:[[[1.35,44.02],[1.351,44.02],[1.351,44.021],[1.35,44.021],[1.35,44.02]]]});
   return typeof area==="number"&&area>1000;
 });
 add("Construction du rapport",()=>typeof window.ANCRealWorkflow?.report==="function");
 const box=$(".live-test-results .anc-v3-body");
 if(box)box.innerHTML='<p><strong>'+checks.filter(x=>x.ok).length+'/'+checks.length+' autotests réussis</strong> — ces tests ne valident pas les formules réglementaires.</p>'+
 checks.map(c=>'<div class="live-check-row"><b>'+(c.ok?"✓":"✕")+'</b><span>'+e(c.name)+'</span><strong>'+e(c.ok?"Réussi":"Échec")+'</strong></div>').join("");
 notice(checks.every(x=>x.ok)?"Autotests de la démo terminés.":"Un autotest du navigateur a échoué.");
}
function reportStatus(section){
 if(section?.id!=="rapport")return;
 const target=$("#axis-report-page",section);
 if(!target)return;
 const result=analyze();
 let p=$(".live-report-control",target);
 if(!p){
   p=document.createElement("p");p.className="notice info live-report-control";
   target.append(p);
 }
 p.textContent="Complétude du dossier : "+result.complete+"/"+result.required+" contrôles de saisie satisfaits. Il ne s’agit pas d’un avis de conformité ANC.";
}
function openOfficial(hint){
 let url="https://www.geoportail.gouv.fr/";
 if(/brgm|géolog|geolog|info.?terre/i.test(hint))url="https://infoterre.brgm.fr/";
 else if(/risque|nappe|inond/i.test(hint))url="https://www.georisques.gouv.fr/";
 else if(/urban|plu/i.test(hint))url="https://www.geoportail-urbanisme.gouv.fr/";
 const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";document.body.append(link);link.click();link.remove();
 notice("Ouverture de la source publique officielle. Les résultats ne sont pas importés automatiquement dans SpeedArti.");
}
function handle(event){
 const b=event.target.closest("button");
 if(!b||!b.closest("#public-sections"))return false;
 const action=b.dataset.action;
 if(b.dataset.liveControl==="refresh"||b.classList.contains("axis-coherence-run")||b.id==="anc-review-run"){
  panel($("#controles"));return true;
 }
 if(action==="run-self-tests"){runTests();return true;}
 if(action==="apply-rules"){
  window.ANCRealWorkflow?.beforeNavigate?.();
  notice("Paramètres de démonstration enregistrés. Leur validation réglementaire reste à réaliser.");
  return true;
 }
 if(action==="generate"&&b.closest("#automatisation")){
  window.ANCRealWorkflow?.beforeNavigate?.();
  window.ANCPublicNavigate?.("rapport");return true;
 }
 if(action==="open-map-source"){openOfficial(b.closest(".map-card")?.textContent||"");return true;}
 if(b.id==="anc-brgm-open"||b.id==="anc-georisques-report"){openOfficial(b.id==="anc-brgm-open"?"BRGM":"Géorisques");return true;}
 if(b.id==="anc-brgm-fetch"){
  notice("La recherche géologique BRGM n'est pas connectée à la démo publique. Ouvrir InfoTerre pour consulter la source officielle.");return true;
 }
 if(b.id==="anc-env-prepare"){
  notice("L'analyse automatique des risques nécessite le moteur privé. Utiliser Géorisques pour la consultation publique.");return true;
 }
 return false;
}
function mount(section){
 if(!section)return;
 if(section.id==="controles")panel(section);
 if(section.id==="automatisation")automation(section);
 if(section.id==="regles")rules(section);
 if(section.id==="tests")testPage(section);
 if(section.id==="rapport")reportStatus(section);
}
window.ANCRealControls={mount,handle,analyze,runTests};
})();