/* ANC V3 — enrichissement terrain. Sources officielles uniquement ; aucun renseignement inventé. */
(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const study=()=>window.ANCRealWorkflow?.getStudy?.();
const mutate=fn=>window.ANCRealWorkflow?.mutateStudy?.(fn);
const parse=x=>x===undefined||x===null||String(x).trim()===""?null:Number(String(x).replace(/\s/g,"").replace(",","."));
const valid=(x,limit)=>x!==null&&Number.isFinite(x)&&Math.abs(x)<=limit;
const point=()=>{
 const f=study()?.fields||{},lat=parse(f["parcel.lat"]),lon=parse(f["parcel.lng"]);
 return valid(lat,90)&&valid(lon,180)&&!(lat===0&&lon===0)?{lat,lon}:null;
};
const pointKey=p=>p?Number(p.lat).toFixed(7)+","+Number(p.lon).toFixed(7):"";
function updateInput(key,value){
 const input=$('#dossier [data-path="'+key+'"]');if(input)input.value=value==null?"":String(value);
}
function status(message,error=false){
 const el=$("#anc-elevation-state");if(!el)return;
 el.textContent=message;el.style.color=error?"#a23e2f":"";
}
function updateDisplay(){
 const s=study(),f=s?.fields||{},p=point();
 const coords=$("#anc-coordinates-readable");
 if(coords){
   const lat=$("#anc-coord-lat"),lon=$("#anc-coord-lon");
   if(lat)lat.textContent=p?p.lat.toFixed(7)+"° N/S":"À localiser";
   if(lon)lon.textContent=p?p.lon.toFixed(7)+"° E/O":"À localiser";
   const origin=$("#anc-coord-origin");
   if(origin)origin.textContent=s?.geolocation?.source||"Non localisé";
 }
 const source=s?.terrainSources?.altitude;
 const a=$("#anc-altitude-source");
 if(a)a.textContent=source?.origin==="IGN"?
   "Altitude IGN RGE ALTI® : "+(source.accuracy||"précision variable")+", mesure terrain à confirmer":
   f["parcel.altitude"]!==undefined&&String(f["parcel.altitude"]).trim()!==""?
   "Altitude renseignée manuellement — à contrôler":"Altitude non déterminée : service IGN en attente ou inaccessible";
 const value=$("#anc-availability-status"),m=s?.terrainSources?.availableArea;
 if(value)value.textContent=m?.origin==="estimate"?
   "Pré-estimation non réglementaire : "+m.total+" − "+m.occupied+" − "+m.excluded+" = "+m.value+" m². Vérifier les contraintes, reculs et réseaux sur plan.":
   f["parcel.availableArea"]!==undefined&&String(f["parcel.availableArea"]).trim()!==""?
   "Surface déclarée manuellement, à confirmer sur plan et sur site.":
   "À déterminer : la contenance cadastrale ne représente pas la surface réellement utilisable pour l'ANC.";
}
async function elevation({force=false}={}){
 const s=study(),p=point();if(!s||!p)return status("Localiser une adresse ou obtenir la position GPS pour demander l’altitude.",true);
 const key=pointKey(p),existing=s?.terrainSources?.altitude;
 if(!force&&existing?.point===key){updateDisplay();return;}
 if(!force&&String(s.fields?.["parcel.altitude"]??"").trim()!==""&&existing?.origin!=="IGN"){
   status("Altitude saisie manuellement : elle n'est pas remplacée sans action volontaire.");
   return;
 }
 if(!force&&s.altitudeAttemptPoint===key)return;
 const currentId=s.id;
 mutate(st=>{if(st.id===currentId)st.altitudeAttemptPoint=key;});
 status("Recherche de l’altitude réelle auprès de l’IGN (RGE ALTI®)…");
 const params=new URLSearchParams({
   lon:String(p.lon),lat:String(p.lat),resource:"ign_rge_alti_wld",
   delimiter:"|",indent:"false",measures:"false",zonly:"false"
 });
 const url="https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?"+params.toString();
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),11000);
 try{
   const r=await fetch(url,{headers:{Accept:"application/json"},signal:ctrl.signal});
   if(!r.ok)throw Error("HTTP "+r.status);
   const data=await r.json(),record=data?.elevations?.[0];
   const z=typeof record==="number"?record:Number(record?.z);
   if(!Number.isFinite(z)||z===-99999||z<=-99900)throw Error("Aucune altitude exploitable pour ce point.");
   if(study()?.id!==currentId||pointKey(point())!==key)return;
   const value=Math.round(z*100)/100;
   const accuracy=typeof record==="object"?record.acc||"précision variable":"précision variable";
   mutate(st=>{
     if(st.id!==currentId||pointKey({lat:Number(st.fields["parcel.lat"]),lon:Number(st.fields["parcel.lng"])})!==key)return;
     const previous=st.terrainSources?.altitude;
     const entered=String(st.fields?.["parcel.altitude"]??"").trim();
     // Ne jamais écraser une correction manuelle faite pendant l'appel.
     if(entered&&previous?.origin!=="IGN")return;
     st.fields["parcel.altitude"]=String(value);
     st.terrainSources=st.terrainSources||{};
     st.terrainSources.altitude={origin:"IGN",point:key,resource:"ign_rge_alti_wld",accuracy,checkedAt:new Date().toISOString(),value};
   });
   updateInput("parcel.altitude",study()?.fields?.["parcel.altitude"]??"");
   status("Altitude obtenue de l'IGN : "+value+" m. Valeur indicative, à contrôler sur le terrain.");
   updateDisplay();
 }catch(error){
   if(study()?.id===currentId&&pointKey(point())===key)
     status("Altitude non récupérée : "+(error.name==="AbortError"?"service trop lent":error.message)+". Saisie manuelle possible.",true);
 }finally{clearTimeout(timeout);}
}
function estimateAvailable(){
 const s=study(),total=parse(s?.fields?.["parcel.totalArea"]);
 const occupied=parse($("#anc-occupied-area")?.value),excluded=parse($("#anc-excluded-area")?.value);
 if(!(total>0))return availabilityError("Détecter d’abord la parcelle et sa surface cadastrale.");
 if(occupied===null||excluded===null)return availabilityError("Renseigner les deux valeurs, même si l’une vaut 0.");
 if(occupied<0||excluded<0||occupied+excluded>total)
   return availabilityError("Surfaces incompatibles avec la superficie cadastrale.");
 const available=Math.round((total-occupied-excluded)*100)/100;
 const id=s.id;
 mutate(st=>{
   if(st.id!==id)return;
   st.fields["parcel.availableArea"]=String(available);
   st.fields["parcel.occupiedArea"]=String(occupied);
   st.fields["parcel.excludedArea"]=String(excluded);
   st.terrainSources=st.terrainSources||{};
   st.terrainSources.availableArea={
     origin:"estimate",total,occupied,excluded,value:available,
     computedAt:new Date().toISOString(),note:"Estimation indicative, hors vérification des contraintes ANC"
   };
 });
 updateInput("parcel.availableArea",String(available));
 updateDisplay();
}
function availabilityError(message){
 const el=$("#anc-availability-status");if(el){el.textContent=message;el.style.color="#a23e2f";}
}
function mount(section){
 if(section?.id!=="dossier")return;
 const geo=$(".geo-location-main",section),s=study();
 if(geo&&!$("#anc-coordinates-readable",geo)){
   const article=document.createElement("div");
   article.id="anc-coordinates-readable";article.className="notice info";
   article.style.cssText="margin:10px 0;padding:10px";
   article.innerHTML='<strong>Coordonnées du chantier</strong><div class="grid g3" style="margin-top:8px">'+
     '<div><b>Latitude :</b> <span id="anc-coord-lat">À localiser</span></div>'+
     '<div><b>Longitude :</b> <span id="anc-coord-lon">À localiser</span></div>'+
     '<div><b>Source :</b> <span id="anc-coord-origin">Non localisé</span></div></div>'+
     '<small>Référence GPS WGS84. Vérifier le point de la parcelle sur la carte.</small>';
   $(".geo-actions",geo)?.insertAdjacentElement("afterend",article);
 }
 const altitude=$('#dossier [data-path="parcel.altitude"]')?.closest(".field");
 if(altitude&&!$("#anc-altitude-source",altitude)){
   const line=document.createElement("small");line.className="anc-source-note";line.id="anc-altitude-source";
   altitude.append(line);
   const button=document.createElement("button");
   button.type="button";button.className="btn secondary small";button.dataset.ancTerrainAction="altitude";
   button.textContent="Rechercher altitude IGN";
   altitude.append(button);
   const info=document.createElement("small");info.className="anc-source-note";info.id="anc-elevation-state";
   altitude.append(info);
 }
 const available=$('#dossier [data-path="parcel.availableArea"]')?.closest(".field");
 if(available&&!$("#anc-availability-status",available)){
   const note=document.createElement("small");note.className="anc-source-note";note.id="anc-availability-status";
   available.append(note);
 }
 const block=$('#dossier [data-path="parcel.availableArea"]')?.closest(".card");
 if(block&&!$("#anc-available-estimator",block)){
   const wrapper=document.createElement("div");wrapper.className="card-body";wrapper.id="anc-available-estimator";
   wrapper.innerHTML='<details><summary><strong>Estimer la surface potentiellement disponible pour l’ANC</strong></summary>'+
     '<p class="small-text">Cette estimation soustrait les surfaces que vous renseignez. Elle n’évalue pas à elle seule les distances réglementaires ni l’aptitude du sol.</p>'+
     '<div class="grid g3"><label class="field">Emprises occupées (bâtiments, voies, etc.) en m²'+
     '<input id="anc-occupied-area" class="input" type="number" min="0" step="0.01" placeholder="À mesurer"></label>'+
     '<label class="field">Surfaces non utilisables (contraintes identifiées) en m²'+
     '<input id="anc-excluded-area" class="input" type="number" min="0" step="0.01" placeholder="À vérifier"></label>'+
     '<div><button type="button" class="btn secondary" data-anc-terrain-action="estimate">Estimer (provisoire)</button></div></div></details>';
   block.append(wrapper);
 }
 const geoCode=$('#dossier [data-path="parcel.geologyCode"]')?.closest(".field");
 if(geoCode&&!$(".anc-geology-note",geoCode)){
   const note=document.createElement("small");note.className="anc-geology-note";
   note.textContent="Formation géologique à relever sur BRGM InfoTerre ; ne pas déduire automatiquement du seul point cadastral.";
   geoCode.append(note);
 }
 const slope=$('#dossier [data-path="parcel.slope"]')?.closest(".field");
 if(slope&&!$(".anc-slope-note",slope)){
   const note=document.createElement("small");note.className="anc-slope-note";
   note.textContent="Pente moyenne à mesurer sur plan altimétrique ou au terrain ; l’altitude d’un point ne suffit pas.";
   slope.append(note);
 }
 if(s){
   const v=s.fields||{};
   const a=$("#anc-occupied-area"),b=$("#anc-excluded-area");
   if(a)a.value=String(v["parcel.occupiedArea"]??"");
   if(b)b.value=String(v["parcel.excludedArea"]??"");
 }
 updateDisplay();
 const key=pointKey(point());
 if(key&&String(s?.fields?.["parcel.altitude"]??"").trim()===""&&s?.altitudeAttemptPoint!==key)
   void elevation();
}
function refreshFromCoordinates(){
 updateDisplay();
 void elevation();
}
document.addEventListener("click",event=>{
 const button=event.target.closest("[data-anc-terrain-action]");
 if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(button.dataset.ancTerrainAction==="altitude")void elevation({force:true});
 else if(button.dataset.ancTerrainAction==="estimate")estimateAvailable();
},true);
document.addEventListener("input",event=>{
 const path=event.target?.dataset?.path;
 if(path==="parcel.altitude"){
   mutate(s=>{
     if(s.terrainSources)s.terrainSources.altitude={origin:"manual",checkedAt:new Date().toISOString()};
   });
 }
 if(path==="parcel.availableArea"){
   mutate(s=>{
     if(s.terrainSources)s.terrainSources.availableArea={origin:"manual",checkedAt:new Date().toISOString()};
   });
 }
},false);
window.ANCTerrainEnrichment={mount,refreshFromCoordinates,updateDisplay,estimateAvailable,elevation};
})();