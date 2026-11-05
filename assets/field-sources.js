/* Sources publiques de terrain. Aucune conclusion règlementaire automatique. */
(()=>{
"use strict";
const $=s=>document.querySelector(s);
const study=()=>window.ANCRealWorkflow?.getStudy?.();
const notify=(t,error=false)=>{const box=$("#public-toast");if(box){box.hidden=false;box.textContent=t;}const el=$("#anc-field-source-result");if(el){el.textContent=t;el.style.color=error?"#ad3d32":"#216447";}};
function coords(){
 const f=study()?.fields||{},lat=Number(f["parcel.lat"]),lon=Number(f["parcel.lng"]);
 if(!f["parcel.lat"]||!f["parcel.lng"]||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error("Localiser une adresse valide dans Dossier avant cette analyse.");
 return {lat,lon};
}
async function getJson(url){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
 try{const r=await fetch(url,{signal:ctl.signal});if(!r.ok)throw Error("Service distant HTTP "+r.status);return await r.json()}finally{clearTimeout(timer)}
}
function store(field,value){
 window.ANCRealWorkflow?.mutateStudy?.(s=>{s.sources=s.sources||{};s.sources[field]={...value,checkedAt:new Date().toISOString()};});
}
function resultContainer(section){
 if(section?.id!=="terrain")return;
 const node=document.createElement("div");node.className="notice info";node.id="anc-field-source-result";node.setAttribute("role","status");
 node.textContent="Les informations externes restent provisoires et nécessitent une vérification professionnelle.";
 section.querySelector("#anc-v3-auto-terrain .anc-v3-body")?.append(node);
 const previous=study()?.sources;
 if(previous?.weather)node.textContent="Dernière météo consultée : "+previous.weather.summary+" — "+previous.weather.date;
}
async function weather(){
 try{
 const {lat,lon}=coords(),f=study()?.fields||{},date=f["visit.studyDate"]||new Date().toISOString().slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error("Date de visite invalide");
 const today=new Date().toISOString().slice(0,10);
 if(date>today)throw Error("La météo historique n'est pas disponible pour une date future.");
 const endpoint="https://archive-api.open-meteo.com/v1/archive?latitude="+lat+"&longitude="+lon+"&start_date="+date+"&end_date="+date+"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis";
 const data=await getJson(endpoint);
 const daily=data.daily||{},rain=daily.precipitation_sum?.[0],tmin=daily.temperature_2m_min?.[0],tmax=daily.temperature_2m_max?.[0];
 if(!Number.isFinite(rain))throw Error("Aucune donnée météo historique sur cette date.");
 const summary="Précipitations "+rain+" mm ; températures "+(tmin??"?")+" à "+(tmax??"?")+" °C";
 store("weather",{date,summary,source:"Open-Meteo Historical Weather API",lat,lon});
 const input=$('[data-path="visit.weather"]');if(input){input.value=summary;input.dispatchEvent(new Event("input",{bubbles:true}));}
 notify("Météo récupérée pour le "+date+" : "+summary+" — Open-Meteo (donnée modélisée, à vérifier).");
 }catch(e){notify("Météo indisponible : "+(e.message||e),true)}
}
async function risk(){
 try{
 const {lat,lon}=coords();
 const endpoint="https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon="+encodeURIComponent(lon+","+lat);
 const data=await getJson(endpoint);
 if(!data||typeof data!=="object")throw Error("Réponse vide");
 const keys=Object.keys(data);
 store("risks",{source:"Géorisques API v1",raw:data,summary:"Réponse officielle reçue ("+keys.length+" rubriques). Analyse métier à confirmer.",lat,lon});
 notify("Géorisques : "+keys.length+" rubriques reçues, conservées dans ce dossier. Aucun risque n'est déclaré absent automatiquement.");
 }catch(e){notify("Risques non déterminés : "+(e.message||e)+". Ouvrir le rapport officiel pour vérifier.",true)}
}
function geological(){
 try{
 const {lat,lon}=coords();
 store("geology",{source:"BRGM InfoTerre — consultation cartographique",summary:"Couche géologique consultable, interprétation du sol non déduite automatiquement.",lat,lon});
 const url="https://infoterre.brgm.fr/viewer/MainTileForward.do?x="+encodeURIComponent(lon)+"&y="+encodeURIComponent(lat);
 const link=$("#anc-brgm-summary");if(link)link.textContent="BRGM : ouvrir la carte géologique officielle pour ce point. Échelle source 1:50 000 ; nature des horizons à confirmer sur le terrain.";
 window.open(url,"_blank","noopener,noreferrer");
 notify("Consultation cartographique BRGM ouverte. Aucune classification pédologique automatique : un sondage terrain reste nécessaire.");
 }catch(e){notify(e.message||String(e),true)}
}
function openReport(){
 try{
 const {lat,lon}=coords();
 window.open("https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi/rapport?lon="+encodeURIComponent(lon)+"&lat="+encodeURIComponent(lat)+"&isCadastre=true","_blank","noopener,noreferrer");
 }catch(e){notify(e.message||String(e),true)}
}
function handle(event){
 const b=event.target.closest("button");if(!b)return false;
 if(b.id==="anc-weather-fetch"){weather();return true;}
 if(b.id==="anc-env-prepare"){risk();return true;}
 if(b.id==="anc-georisques-report"){openReport();return true;}
 if(b.id==="anc-brgm-fetch"||b.id==="anc-brgm-open"){geological();return true;}
 return false;
}
window.ANCFieldSources={mount:resultContainer,handle};
})();