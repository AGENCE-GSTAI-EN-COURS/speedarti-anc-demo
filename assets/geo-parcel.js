/* SpeedArti ANC — Parcelles utilisables, sources publiques IGN/Géoplateforme.
 * Aucune superficie ni coordonnée fictive inventée lors d'une détection.
 * Les valeurs restent provisoires jusqu'à confirmation par le professionnel.
 */
(()=>{
"use strict";
const $=(q,r=document)=>r.querySelector(q);
const $$=(q,r=document)=>Array.from(r.querySelectorAll(q));
const get=()=>window.ANCRealWorkflow?.getStudy?.();
const mutate=cb=>window.ANCRealWorkflow?.mutateStudy?.(cb);
const esc=t=>String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const create=(blank=true)=>({id:"p_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7),label:blank?"":"Parcelle principale",section:"",number:"",area:"",source:"Saisie manuelle",status:"TO_CONFIRM"});
const num=x=>{
 if(x===null||x===undefined||String(x).trim()==="")return null;
 const parsed=Number(String(x).replace(/[\s\u00a0\u202f]/g,"").replace(",","."));
 return Number.isFinite(parsed)?parsed:null;
};
let busy=false;
let pendingParcelSelection=null;
let pendingParcelRequest=0;
let autoLocateTimer=null;
const addressParts=["parcel.address","parcel.postalCode","parcel.city"];
const addressKey=f=>addressParts.map(key=>String(f?.[key]||"").trim().toLocaleLowerCase("fr-FR")).join("|");
function addressReady(f){
 const addr=String(f?.["parcel.address"]||"").trim(),city=String(f?.["parcel.city"]||"").trim();
 return addr.length>=4&&city.length>=2&&!/d[ée]mo|d[ée]monstration|exemple|commune test/i.test(addr+" "+city);
}
function syncLocationFields(){
 const fields=get()?.fields||{};
 for(const key of addressParts){
   const value=String(fields[key]||"");
   const field=$('[data-path="'+key+'"]');if(field&&field.value!==value)field.value=value;
   const edit=$('[data-location-entry="'+key+'"]');if(edit&&edit.value!==value)edit.value=value;
 }
 for(const key of ["parcel.lat","parcel.lng"]){
   const field=$('[data-path="'+key+'"]');if(field)field.value=String(fields[key]||"");
 }
}
function invalidateOldDetection(){
 mutate(st=>{
   st.parcels=(st.parcels||[]).filter(p=>p.status!=="AUTO_DETECTED");
   st.geolocation=null;
   st.cadastralGeometry=null;
   st.fields["parcel.lat"]="";
   st.fields["parcel.lng"]="";
   st.fields["parcel.area"]="";
   st.fields["parcel.totalArea"]="";
   // Invalider uniquement les enrichissements dépendant du point et de la parcelle.
   st.fields["parcel.altitude"]="";
   st.altitudeAttemptPoint="";
   if(st.terrainSources){
     delete st.terrainSources.altitude;
     if(st.terrainSources.availableArea?.origin==="estimate"){
       st.fields["parcel.availableArea"]="";
       st.fields["parcel.occupiedArea"]="";
       st.fields["parcel.excludedArea"]="";
       delete st.terrainSources.availableArea;
     }
   }
   const first=st.parcels.find(p=>p.section&&p.number);
   st.fields["parcel.section"]=first?.section||"";
   st.fields["parcel.number"]=first?.number||"";
 });
 window.ANCMapRuntime?.clearParcel?.();
 render();
}
function topLocation(section){
 const location=$(".geo-location-card",section)?.closest("article");
 if(!location)return;
 // La recherche d'adresse précède désormais l'identification du dossier.
 section.querySelector(".section-head")?.insertAdjacentElement("afterend",location);
 let form=$("#anc-location-entry",location);
 if(!form){
   form=document.createElement("div");form.id="anc-location-entry";
   form.className="grid g3";
   form.style.cssText="padding:12px 0;gap:12px";
   const labels=[["parcel.address","Adresse du projet"],["parcel.postalCode","Code postal"],["parcel.city","Commune"]];
   form.innerHTML=labels.map(([key,label])=>'<label class="field"><strong>'+esc(label)+'</strong><input type="text" class="input" data-location-entry="'+key+'" autocomplete="off" placeholder="'+esc(label)+'"></label>').join("");
   location.querySelector(".geo-location-main")?.insertBefore(form,location.querySelector(".geo-status-row"));
 }
 syncLocationFields();
 let status=$("#anc-location-chain-status",location);
 if(!status){
   status=document.createElement("p");status.id="anc-location-chain-status";status.className="anc-source-note";
   form.insertAdjacentElement("afterend",status);
 }
 const st=get();
 status.textContent=st?.geolocation?.source?
   "Localisation enregistrée ("+st.geolocation.source+"). Section et surface cadastrales ci-dessous, à confirmer.":
   addressReady(st?.fields)?"Adresse prête : localisation IGN puis recherche cadastrale automatique.":
   "Compléter l'adresse et la commune, ou utiliser le GPS. La section et la surface se rempliront après détection.";
}

function message(m,error=false){
  let el=$("#anc-parcel-feedback");
  if(!el&&$("#anc-v3-parcels")){
    el=document.createElement("p");el.id="anc-parcel-feedback";el.className="anc-source-note";
    $("#anc-v3-parcels .anc-v3-body")?.appendChild(el);
  }
  if(el){el.textContent=m;el.style.color=error?"#aa4128":"#226850";}
  const toast=$("#public-toast");
  if(toast){toast.textContent=m;toast.hidden=false;}
}
function normalizeArea(r){
  const p=r.properties||{};
  for(const key of ["contenance","surface_m2","surface","surface_cadastre","contenance_cadastrale","surface_parcelle"]){
    const v=num(p[key]);if(v!==null&&v>0)return {area:Math.round(v),exact:key==="contenance"};
  }
  return {area:geometryArea(r.geometry),exact:false};
}
function ringArea(ring){
  if(!Array.isArray(ring)||ring.length<4)return 0;
  const centerLat=ring.reduce((s,p)=>s+p[1],0)/ring.length;
  const mx=111320*Math.cos(centerLat*Math.PI/180),my=111132;
  let sum=0;
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length];
    sum+=(a[0]*mx)*(b[1]*my)-(b[0]*mx)*(a[1]*my);
  }
  return Math.abs(sum)/2;
}
function geometryArea(geom){
  if(!geom)return null;
  const polygons=geom.type==="Polygon"?[geom.coordinates]:geom.type==="MultiPolygon"?geom.coordinates:[];
  const surface=polygons.reduce((sum,rings)=>sum+Math.max(0,ringArea(rings[0])-(rings.slice(1).reduce((a,b)=>a+ringArea(b),0))),0);
  return surface>0?Math.round(surface):null;
}
function currentParcels(){
  const s=get();return Array.isArray(s?.parcels)?s.parcels:[];
}
function updateTotals(){
  const arr=currentParcels();
  const current=get(),geom=current?.cadastralGeometry;
  // Surface géométrique indicative si l'API ne donne pas la contenance.
  if(geom){
    const detected=arr.find(p=>p.status==="AUTO_DETECTED");
    if(detected&&!(num(detected.area)>0)){
      const area=geometryArea(geom);
      if(area!==null&&area>0)mutate(st=>{
        const parcel=st.parcels?.find(p=>p.id===detected.id);
        if(parcel){parcel.area=area;parcel.source="Cadastre IGN — surface géométrique indicative";}
      });
    }
  }
  const fresh=currentParcels();
  const known=fresh.map(p=>num(p.area)).filter(v=>v!==null&&v>0);
  const total=known.reduce((a,b)=>a+b,0);
  const el=$("#anc-parcel-total");if(el)el.textContent=known.length?total.toLocaleString("fr-FR",{maximumFractionDigits:2})+" m²":"Surface à renseigner";
  const field=$('[data-path="parcel.totalArea"]');
  if(field){field.value=known.length?String(total):"";field.readOnly=true;field.title="Calculée automatiquement depuis la liste des parcelles";}
  mutate(s=>{
    s.fields=s.fields||{};
    s.fields["parcel.totalArea"]=known.length?String(total):"";
    const first=s.parcels?.find(p=>p.status==="AUTO_DETECTED")||s.parcels?.find(p=>p.section&&p.number);
    if(first){s.fields["parcel.section"]=String(first.section||"");s.fields["parcel.number"]=String(first.number||"");s.fields["parcel.area"]=num(first.area)===null?"":String(first.area);}
  });
  syncPrimaryFields();
  window.ANCTerrainEnrichment?.updateDisplay?.();
  const note=$("#anc-parcel-surface-source");
  const first=fresh.find(p=>p.status==="AUTO_DETECTED")||fresh.find(p=>p.area!==""&&p.section&&p.number);
  if(note)note.textContent=first?.source||"Surface non déterminée : cliquer sur Détecter la parcelle ou saisir une mesure vérifiée.";
}
function syncPrimaryFields(){
  const s=get(),f=s?.fields||{},parcels=s?.parcels||[];
  const selected=parcels.find(p=>p.status==="AUTO_DETECTED")||parcels.find(p=>p.section&&p.number);
  for(const [key,value] of [
    ["parcel.section",selected?.section??f["parcel.section"]??""],
    ["parcel.number",selected?.number??f["parcel.number"]??""],
    ["parcel.area",selected?.area??f["parcel.area"]??""],
    ["parcel.totalArea",f["parcel.totalArea"]??""]
  ]){
    const el=$('[data-path="'+key+'"]');if(el)el.value=String(value);
  }
  const meta=$(".geo-meta");
  if(meta){
    const spans=meta.querySelectorAll("span");
    if(spans[3])spans[3].textContent=parcels.filter(p=>p.section&&p.number).map(p=>p.section+" "+p.number).join(", ")||"Non détectée";
  }
}
function render(){
  const list=$("#anc-v3-parcel-list");if(!list)return;
  if(!$("#anc-parcel-surface-source")){
    const area=$("#dossier [data-path='parcel.totalArea']");
    const note=document.createElement("small");note.id="anc-parcel-surface-source";note.className="anc-source-note";
    area?.closest(".field")?.append(note);
  }
  const entries=currentParcels();
  list.replaceChildren();
  entries.forEach((p,i)=>{
    const row=document.createElement("div");row.className="anc-v3-parcel";row.dataset.parcelId=p.id;
    row.innerHTML='<div class="field"><label>Libellé</label><input class="input anc-p-label" data-parcel-field="label" value="'+esc(p.label)+'"></div>'+
      '<div class="field"><label>Section</label><input class="input anc-p-section" data-parcel-field="section" value="'+esc(p.section)+'"></div>'+
      '<div class="field"><label>Numéro</label><input class="input anc-p-number" data-parcel-field="number" value="'+esc(p.number)+'"></div>'+
      '<div class="field"><label>Surface (m²)</label><input class="input anc-p-surface" data-parcel-field="area" type="number" min="0" step=".01" value="'+esc(p.area)+'"></div>'+
      '<div class="field"><label>Statut</label><span class="anc-v3-status">'+esc(p.status||"TO_CONFIRM")+'</span><small>'+esc(p.source||"Saisie manuelle")+'</small></div>'+
      '<button type="button" class="btn danger small anc-p-remove" data-parcel-delete="'+esc(p.id)+'">Supprimer</button>';
    list.appendChild(row);
  });
  updateTotals();
}
function mount(section){
  if(section?.id!=="dossier")return;
  const st=get();if(!st)return;
  if(!Array.isArray(st.parcels)){
    const existing=$$(".anc-v3-parcel",section);
    const seed=st.isNew?[]:existing.map(el=>({
      id:el.dataset.parcelId||create().id,label:$(".anc-p-label",el)?.value||"",
      section:$(".anc-p-section",el)?.value||"",number:$(".anc-p-number",el)?.value||"",
      area:$(".anc-p-surface",el)?.value||"",status:"TO_CONFIRM",source:"Exemple du dossier (à confirmer)"
    }));
    mutate(s=>{s.parcels=seed.length?seed:[create()];});
  }
  const noticeEl=$(".geo-map-frame",section);
  if(noticeEl)noticeEl.dataset.demo="geolocation";
  const sourceNote=$(".geo-actions",section)?.previousElementSibling;
  if(sourceNote?.classList.contains("notice")){
    sourceNote.textContent="Localisation : saisir une vraie adresse pour interroger la Géoplateforme IGN. La détection n’invente pas de coordonnées ni de surfaces.";
  }
  const meta=$(".geo-meta",section);
  if(meta){
    const labels=$$("span",meta);
    const st=get(),fields=st?.fields||{},loc=st?.geolocation;
    if(labels[0])labels[0].textContent=loc?.label||"À rechercher";
    if(labels[1])labels[1].textContent=loc?.source||"Géoplateforme IGN / BAN";
    if(labels[2])labels[2].textContent=loc?.score!==undefined?Math.round(Number(loc.score)*100)+" % — à vérifier":"Non vérifiée";
    if(labels[3])labels[3].textContent=st?.parcels?.map(p=>p.section&&p.number?p.section+" "+p.number:"").filter(Boolean).join(", ")||"Non détectée";
  }
  render();syncPrimaryFields();
  topLocation(section);
  const current=get();
  if(addressReady(current?.fields)&&
     (current?.pendingAutoLocate||(!current?.geolocation&&!current?.lastAutoLocateAttemptKey))){
    mutate(s=>{s.pendingAutoLocate=false;s.lastAutoLocateAttemptKey=addressKey(s.fields);});
    setTimeout(()=>{if($("#dossier"))geocode();},100);
  }
}
function addParcel(){
  mutate(st=>{st.parcels=st.parcels||[];st.parcels.push(create());});
  render();message("Parcelle ajoutée. Renseigner sa section, son numéro et sa surface.");
}
function editParcel(el){
  const row=el.closest(".anc-v3-parcel");if(!row)return;
  const id=row.dataset.parcelId,key=el.dataset.parcelField;
  if(!key)return;
  mutate(st=>{
    const p=(st.parcels||[]).find(x=>x.id===id);
    if(p){p[key]=el.value;p.status="TO_CONFIRM";p.source="Saisie manuelle";}
  });
  const status=$(".anc-v3-status",row);if(status)status.textContent="TO_CONFIRM";
  updateTotals();
}
function removeParcel(id){
  mutate(s=>{
    s.parcels=(s.parcels||[]).filter(p=>p.id!==id);
    if(!s.parcels.length)s.parcels=[create()];
  });
  render();message("Parcelle supprimée du dossier de démonstration.");
}
async function json(url){
  const ctrl=new AbortController();const stop=setTimeout(()=>ctrl.abort(),9500);
  try{
    const result=await fetch(url,{signal:ctrl.signal,headers:{"Accept":"application/json"}});
    if(!result.ok)throw Error("Réponse HTTP "+result.status);
    return await result.json();
  }finally{clearTimeout(stop);}
}
function showParcelSelectionPanel(text,options=[]){
 const panel=document.querySelector(".anc-map-selection-panel");
 if(!panel)return;
 panel.replaceChildren();
 const p=document.createElement("p");
 p.className="anc-source-note";p.setAttribute("role","status");p.textContent=text;panel.append(p);
 if(!options.length)return;
 const label=document.createElement("label");label.className="field";label.textContent="Parcelle cadastrale au point choisi";
 const select=document.createElement("select");select.className="select";select.id="anc-map-parcel-choice";
 options.forEach((f,i)=>{
   const p=f.properties||{},area=normalizeArea(f),op=document.createElement("option");
   op.value=String(i);
   op.textContent=[p.section||"",p.numero||p.number||"",area.area!==null?area.area+" m²":"surface inconnue"].filter(Boolean).join(" — ");
   select.append(op);
 });
 label.append(select);panel.append(label);
 const controls=document.createElement("div");controls.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
 const confirm=document.createElement("button");confirm.type="button";confirm.className="btn primary";
 confirm.dataset.ancMapConfirm="1";confirm.textContent="Confirmer cette parcelle";
 const cancel=document.createElement("button");cancel.type="button";cancel.className="btn secondary";
 cancel.dataset.ancMapCancel="1";cancel.textContent="Annuler";
 controls.append(confirm,cancel);panel.append(controls);
 const note=document.createElement("p");note.className="anc-source-note";
 note.textContent="La sélection ne modifie pas le dossier avant confirmation. Vérifiez la section, le numéro et le contour cadastral.";panel.append(note);
}
async function proposeMapPoint(lat,lng){
 const st=get(),id=st?.id;
 if(!id||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){
   showParcelSelectionPanel("Point invalide : cliquer à l'intérieur de la parcelle.",[]);return;
 }
 const request=++pendingParcelRequest;
 pendingParcelSelection=null;
 showParcelSelectionPanel("Recherche des parcelles au point choisi…",[]);
 try{
   const geom=JSON.stringify({type:"Point",coordinates:[lng,lat]});
   const data=await json("https://apicarto.ign.fr/api/cadastre/parcelle?geom="+encodeURIComponent(geom));
   if(request!==pendingParcelRequest||get()?.id!==id)return;
   const features=Array.isArray(data.features)?data.features.filter(f=>f?.geometry&&f?.properties):[];
   if(!features.length){
     showParcelSelectionPanel("Aucune parcelle à ce point. Cliquez sur un autre emplacement, à l'intérieur du contour cadastral. Les données déjà enregistrées sont conservées.",[]);
     return;
   }
   pendingParcelSelection={studyId:id,lat,lng,features};
   showParcelSelectionPanel(features.length===1?
      "Parcelle proposée à ce point : vérifiez la référence puis confirmez.":
      features.length+" parcelles trouvées à ce point : sélectionnez la bonne référence avant confirmation.",features);
 }catch(err){
   if(request!==pendingParcelRequest)return;
   showParcelSelectionPanel("Cadastre inaccessible : "+String(err?.message||err)+". Aucune donnée du dossier n'a été modifiée.",[]);
 }
}
function cancelMapSelection(){
 ++pendingParcelRequest;pendingParcelSelection=null;
 window.ANCMapRuntime?.finishParcelPick?.();
 message("Correction de parcelle annulée : l'ancienne référence est conservée.");
}
function confirmMapSelection(){
 const pending=pendingParcelSelection;
 if(!pending||get()?.id!==pending.studyId){
   message("Aucune nouvelle parcelle sélectionnée. Cliquez d'abord sur un point de la carte.",true);return;
 }
 const select=document.querySelector("#anc-map-parcel-choice");
 const index=Number(select?.value??0);
 const feature=pending.features[index];
 if(!feature)return message("Choisir une parcelle dans la liste.",true);
 const p=feature.properties||{},section=String(p.section||"").trim(),number=String(p.numero||p.number||"").trim();
 if(!section||!number)return message("Référence cadastrale incomplète dans la réponse IGN : sélection non enregistrée.",true);
 const area=normalizeArea(feature),lat=pending.lat,lng=pending.lng,studyId=pending.studyId;
 // La confirmation seule autorise à remplacer le point géocodé et l'ancienne parcelle.
 invalidateOldDetection();
 mutate(st=>{
   if(st.id!==studyId)return;
   const extra=(st.parcels||[]).filter(x=>x.status!=="AUTO_DETECTED"&&x.source==="Saisie manuelle"&&x.section&&x.number&&x.area!==""&&!(x.section===section&&x.number===number));
   st.parcels=[...extra,{id:create().id,label:"Parcelle sélectionnée sur la carte",section,number,
     area:area.area??"",source:area.exact?"Cadastre IGN — contenance source":"Cadastre IGN — surface géométrique indicative",
     status:"AUTO_DETECTED"}];
   st.fields["parcel.lat"]=String(lat);st.fields["parcel.lng"]=String(lng);
   st.fields["parcel.section"]=section;st.fields["parcel.number"]=number;
   st.fields["parcel.area"]=area.area===null?"":String(area.area);
   st.cadastralGeometry=feature.geometry;
   st.pendingAutoLocate=false;
   st.lastAutoLocateAttemptKey=addressKey(st.fields);
   st.locationAddressKey=addressKey(st.fields);
   st.geolocation={lat,lng,label:"Point sélectionné sur la carte",source:"Choix manuel sur carte",at:new Date().toISOString()};
   st.userSelectedParcel={section,number,lat,lng,selectedAt:new Date().toISOString(),source:"API Carto IGN"};
 });
 pendingParcelSelection=null;++pendingParcelRequest;
 syncLocationFields();render();syncPrimaryFields();topLocation(document.querySelector("#dossier"));
 window.ANCMapRuntime?.refresh?.();
 window.ANCMapRuntime?.showParcel?.(feature);
 window.ANCMapRuntime?.finishParcelPick?.();
 window.ANCTerrainEnrichment?.refreshFromCoordinates?.();
 message("Parcelle "+section+" "+number+" sélectionnée sur la carte"+(area.area===null?" (surface indisponible)":" — "+area.area+" m²")+
   ". Point enregistré ; géométrie, surface et implantation restent à confirmer.");
}
async function geocode(){
 clearTimeout(autoLocateTimer);
 if(busy)return message("Recherche précédente en cours.",true);
 const before=get(),studyId=before?.id,lookupKey=addressKey(before?.fields);
 if(!addressReady(before?.fields))return message("Renseigner une adresse de projet et une commune réelles (ou utiliser le GPS).",true);
 busy=true;let shouldDetect=false;
 try{
   const f=before.fields;
   const query=addressParts.map(key=>String(f[key]||"").trim()).filter(Boolean).join(" ");
   message("Recherche de l'adresse et de la parcelle auprès de l'IGN…");
   const data=await json("https://data.geopf.fr/geocodage/search?q="+encodeURIComponent(query)+"&limit=1");
   const feature=data.features?.[0],coords=feature?.geometry?.coordinates;
   if(!Array.isArray(coords)||coords.length<2)throw Error("Adresse introuvable. Vérifier la rue et la commune.");
   const lng=Number(coords[0]),lat=Number(coords[1]);
   if(!Number.isFinite(lat)||!Number.isFinite(lng))throw Error("Coordonnées non valides.");
   if(get()?.id!==studyId||addressKey(get()?.fields)!==lookupKey)return;
   const properties=feature.properties||{},label=String(properties.label||query);
   invalidateOldDetection();
   mutate(st=>{
     if(st.id!==studyId)return;
     st.fields["parcel.lat"]=String(lat);st.fields["parcel.lng"]=String(lng);
     if(properties.name)st.fields["parcel.address"]=String(properties.name);
     if(properties.postcode)st.fields["parcel.postalCode"]=String(properties.postcode);
     if(properties.city)st.fields["parcel.city"]=String(properties.city);
     st.locationAddressKey=addressKey(st.fields);
     st.geolocation={lat,lng,label,score:properties.score,source:"Géoplateforme IGN/BAN",at:new Date().toISOString()};
   });
   syncLocationFields();
   mount($("#dossier"));window.ANCMapRuntime?.refresh?.();
   window.ANCTerrainEnrichment?.refreshFromCoordinates?.();
   message("Adresse reconnue : "+label+". Recherche de la parcelle et de sa superficie…");
   shouldDetect=true;
 }catch(err){message("Localisation impossible : "+String(err?.message||err),true)}
 finally{busy=false}
 // Ne pas laisser une minuterie indépendante en cas de changement de client.
 if(shouldDetect&&get()?.id===studyId)await detectParcel();
}
async function detectParcel(){
  if(busy)return message("Une recherche est déjà en cours.",true);
  const fields=get()?.fields||{};
  const lat=num(fields["parcel.lat"]),lng=num(fields["parcel.lng"]);
  if((lat===null||lng===null)&&addressReady(fields))return geocode();
  busy=true;
  try{
    const f=path=>$('[data-path="'+path+'"]')?.value||"";
    const lat=num(f("parcel.lat")),lng=num(f("parcel.lng"));
    if(lat===null||lng===null||lat<-90||lat>90||lng<-180||lng>180||lat===0&&lng===0)
      throw Error("Localiser d’abord le chantier ou renseigner ses coordonnées.");
    message("Interrogation du cadastre officiel…");
    const geom=JSON.stringify({type:"Point",coordinates:[lng,lat]});
    const data=await json("https://apicarto.ign.fr/api/cadastre/parcelle?geom="+encodeURIComponent(geom));
    const features=Array.isArray(data.features)?data.features:[];
    if(!features.length)throw Error("Aucune parcelle trouvée à ce point. Vérifier la position.");
    const ftr=features[0],p=ftr.properties||{};
    const area=normalizeArea(ftr);
    const section=String(p.section||p.prefixe||"");
    const number=String(p.numero||p.number||"");
    const src=area.exact?"Cadastre IGN — contenance source":"Cadastre IGN — surface géométrique indicative";
    const entry={id:create().id,label:"Parcelle détectée",section,number,area:area.area??"",status:"AUTO_DETECTED",source:src};
    mutate(st=>{
      st.parcels=Array.isArray(st.parcels)?st.parcels:[];
      const exists=st.parcels.find(x=>x.section===section&&x.number===number&&section&&number);
      if(exists){
        exists.area=entry.area;
        exists.source=src;exists.status="AUTO_DETECTED";
      }else if(st.parcels.length===1&&(String(st.parcels[0].source||"").startsWith("Exemple du dossier")||(st.parcels[0].area===""&&!st.parcels[0].number)))
        st.parcels[0]=entry;
      else st.parcels.push(entry);
      st.fields["parcel.section"]=section;st.fields["parcel.number"]=number;
      st.fields["parcel.area"]=area.area===null?"":String(area.area);
      st.cadastralGeometry=ftr.geometry||null;
    });
    render();syncPrimaryFields();window.ANCMapRuntime?.showParcel?.(ftr);
    window.ANCTerrainEnrichment?.refreshFromCoordinates?.();
    for(const [path,value] of [["parcel.section",section],["parcel.number",number]]){
      const el=$('[data-path="'+path+'"]');if(el)el.value=value;
    }
    message(area.area!==null?"Parcelle récupérée : "+section+" "+number+" — "+area.area+" m² ("+src+"). À confirmer.":"Parcelle identifiée : "+section+" "+number+". Surface non disponible : saisie manuelle nécessaire.");
  }catch(err){message("Cadastre : "+String(err?.message||err),true)}
  finally{busy=false}
}
function gps(){
 clearTimeout(autoLocateTimer);
 if(!navigator.geolocation)return message("Géolocalisation GPS indisponible sur cet appareil.",true);
 message("Autorisation GPS requise. Le point localisé devra être vérifié sur la carte.");
 navigator.geolocation.getCurrentPosition(async pos=>{
   const studyId=get()?.id,lat=pos.coords.latitude,lng=pos.coords.longitude;
   invalidateOldDetection();
   mutate(st=>{
     if(st.id!==studyId)return;
     st.fields["parcel.lat"]=String(lat);st.fields["parcel.lng"]=String(lng);
     st.geolocation={lat,lng,label:"Position GPS de l'appareil",source:"GPS",accuracy:pos.coords.accuracy,at:new Date().toISOString()};
   });
   // Géocodage inverse pour compléter l'adresse du projet, sans inventer de commune.
   try{
     const r=await json("https://data.geopf.fr/geocodage/reverse?lon="+encodeURIComponent(lng)+"&lat="+encodeURIComponent(lat));
     const p=r.features?.[0]?.properties||{};
     if(get()?.id!==studyId)return;
     mutate(st=>{
       if(st.id!==studyId)return;
       if(p.name)st.fields["parcel.address"]=String(p.name);
       else if(p.street)st.fields["parcel.address"]=[p.housenumber,p.street].filter(Boolean).join(" ");
       if(p.postcode)st.fields["parcel.postalCode"]=String(p.postcode);
       if(p.city)st.fields["parcel.city"]=String(p.city);
       if(p.citycode&&p.citycode.length>=2)st.fields["parcel.department"]=String(p.citycode).slice(0,2);
       st.geolocation.label=p.label||st.geolocation.label;
       st.locationAddressKey=addressKey(st.fields);
     });
   }catch(err){message("GPS obtenu, mais adresse inverse indisponible. Le cadastre sera néanmoins interrogé.")}
   syncLocationFields();
   mount($("#dossier"));window.ANCMapRuntime?.refresh?.();
   if(get()?.id===studyId)await detectParcel();
 },err=>message("GPS non disponible : "+(err.message||"Autorisation refusée"),true),
 {timeout:12000,enableHighAccuracy:true,maximumAge:0});
}
function handle(event){
  const el=event.target.closest("button");if(!el)return false;
  if(el.dataset.ancMapConfirm!==undefined){confirmMapSelection();return true;}
  if(el.dataset.ancMapCancel!==undefined){cancelMapSelection();return true;}
  if(el.id==="anc-add-parcel"){addParcel();return true;}
  if(el.dataset.parcelDelete){removeParcel(el.dataset.parcelDelete);return true;}
  if(el.dataset.action==="geocode-address"){geocode();return true;}
  if(el.dataset.action==="use-device-gps"){gps();return true;}
  if(el.dataset.action==="detect-parcel"||el.id==="anc-detect-parcel"){detectParcel();return true;}
  return false;
}
document.addEventListener("input",event=>{
 const el=event.target;
 if(el.matches("[data-parcel-field]"))editParcel(el);
 const key=el?.dataset?.locationEntry;
 if(addressParts.includes(key)){
   const value=el.value;
   const original=$('#dossier [data-path="'+key+'"]');
   if(original)original.value=value;
   mutate(st=>{st.fields[key]=value;});
 }
},true);
document.addEventListener("change",event=>{
 const el=event.target;
 if(el.matches("[data-parcel-field]"))editParcel(el);
 const key=el?.dataset?.locationEntry||el?.dataset?.path;
 if(!addressParts.includes(key))return;
 const value=el.value;
 const before=get(),previousKey=before?.locationAddressKey;
 mutate(st=>{st.fields[key]=value;});
 syncLocationFields();
 const now=get();
 if(previousKey&&previousKey!==addressKey(now?.fields))invalidateOldDetection();
 clearTimeout(autoLocateTimer);
 if(addressReady(now?.fields)){
   autoLocateTimer=setTimeout(()=>{if($("#dossier"))geocode();},800);
 }else{
   const status=$("#anc-location-chain-status");
   if(status)status.textContent="Adresse incomplète : compléter la rue et la commune ou utiliser le GPS.";
 }
},true);
window.ANCGeoParcel={mount,handle,geometryArea,proposeMapPoint};
})();