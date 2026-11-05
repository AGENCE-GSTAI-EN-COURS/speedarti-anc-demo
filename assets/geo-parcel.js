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
const num=x=>x===null||x===undefined||String(x).trim()===""?null:Number.isFinite(Number(String(x).replace(",",".")))?Number(String(x).replace(",",".")):null;
let busy=false;
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
  for(const key of ["contenance","surface_m2","surface","surface_cadastre"]){
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
  const known=arr.map(p=>num(p.area)).filter(v=>v!==null&&v>=0);
  const total=known.reduce((a,b)=>a+b,0);
  const el=$("#anc-parcel-total");if(el)el.textContent=known.length?total.toLocaleString("fr-FR",{maximumFractionDigits:2})+" m²":"Surface à renseigner";
  const field=$('[data-path="parcel.totalArea"]');
  if(field){field.value=known.length?String(total):"";field.readOnly=true;field.title="Calculée automatiquement depuis la liste des parcelles";}
  mutate(s=>{
    s.fields=s.fields||{};
    s.fields["parcel.totalArea"]=known.length?String(total):"";
  });
}
function render(){
  const list=$("#anc-v3-parcel-list");if(!list)return;
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
  render();
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
async function geocode(){
  if(busy)return;busy=true;
  try{
    const f=path=>$('[data-path="'+path+'"]')?.value?.trim()||"";
    const query=[f("parcel.address"),f("parcel.postalCode"),f("parcel.city")].filter(Boolean).join(" ");
    if(query.length<8||/d[ée]monstration|commune d[ée]mo/i.test(query))
      throw Error("Saisir une véritable adresse de chantier, pas l’adresse fictive de l’exemple.");
    message("Recherche de l’adresse auprès de la Géoplateforme IGN…");
    const data=await json("https://data.geopf.fr/geocodage/search?q="+encodeURIComponent(query)+"&limit=1");
    const feature=data.features?.[0];const coords=feature?.geometry?.coordinates;
    if(!Array.isArray(coords)||coords.length<2)throw Error("Adresse introuvable. Vérifier l'adresse et la commune.");
    const lng=Number(coords[0]),lat=Number(coords[1]);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))throw Error("Coordonnées de la source non valides.");
    const label=String(feature.properties?.label||query);
    const score=feature.properties?.score;
    mutate(st=>{
      st.fields["parcel.lat"]=String(lat);
      st.fields["parcel.lng"]=String(lng);
      st.geolocation={lat,lng,label,score,source:"Géoplateforme IGN/BAN",at:new Date().toISOString()};
    });
    const a=$('[data-path="parcel.lat"]'),b=$('[data-path="parcel.lng"]');
    if(a)a.value=String(lat);if(b)b.value=String(lng);
    mount($("#dossier"));window.ANCMapRuntime?.refresh?.();
    message("Adresse reconnue : "+label+" — latitude "+lat.toFixed(5)+", longitude "+lng.toFixed(5)+". Vérification nécessaire.");
  }catch(err){message("Localisation impossible : "+String(err?.message||err),true)}
  finally{busy=false;}
}
async function detectParcel(){
  if(busy)return;busy=true;
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
        if(num(exists.area)===null)exists.area=entry.area;
        exists.source=src;exists.status="AUTO_DETECTED";
      }else if(st.parcels.length===1&&st.parcels[0].area===""&&!st.parcels[0].number)
        st.parcels[0]=entry;
      else st.parcels.push(entry);
      st.fields["parcel.section"]=section;st.fields["parcel.number"]=number;
    });
    render();window.ANCMapRuntime?.showParcel?.(ftr);
    for(const [path,value] of [["parcel.section",section],["parcel.number",number]]){
      const el=$('[data-path="'+path+'"]');if(el)el.value=value;
    }
    message(area.area!==null?"Parcelle récupérée : "+section+" "+number+" — "+area.area+" m² ("+src+"). À confirmer.":"Parcelle identifiée : "+section+" "+number+". Surface non disponible : saisie manuelle nécessaire.");
  }catch(err){message("Cadastre : "+String(err?.message||err),true)}
  finally{busy=false}
}
function gps(){
  if(!navigator.geolocation)return message("La géolocalisation n’est pas disponible sur ce navigateur.",true);
  message("Demande d’autorisation de localisation GPS…");
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude,lng=pos.coords.longitude;
    mutate(st=>{
      st.fields["parcel.lat"]=String(lat);st.fields["parcel.lng"]=String(lng);
      st.geolocation={lat,lng,label:"GPS de l’appareil",source:"GPS",at:new Date().toISOString()};
    });
    for(const [key,value] of [["parcel.lat",lat],["parcel.lng",lng]]){
      const el=$('[data-path="'+key+'"]');if(el)el.value=String(value);
    }
    mount($("#dossier"));window.ANCMapRuntime?.refresh?.();message("Position GPS renseignée. Vérifier le point avant de détecter la parcelle.");
  },err=>message("GPS non disponible : "+(err.message||"Autorisation refusée"),true),{timeout:12000,enableHighAccuracy:true});
}
function handle(event){
  const el=event.target.closest("button");if(!el)return false;
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
},true);
document.addEventListener("change",event=>{
  const el=event.target;if(el.matches("[data-parcel-field]"))editParcel(el);
},true);
window.ANCGeoParcel={mount,handle,geometryArea};
})();