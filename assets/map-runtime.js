/* SpeedArti ANC — cartographie de démonstration avec vues, calques et sauvegarde locale.
 * Ne contient aucun calcul réglementaire du moteur privé.
 * Les couches distantes restent des références à vérifier, pas des captures certifiées.
 */
(()=>{
"use strict";
let map=null,marker=null,parcelLayer=null,pickerMarker=null,pickerMode=false;
let activeSection=null,activeStudyId=null,activeView="implantation",activeBase="aerial";
let mapLayers={},activeOverlays=new Set(),activeOpacity={},layerErrors=new Set();
const IGN="https://data.geopf.fr/wms-r/wms";
const BRGM_GEO="https://geoservices.brgm.fr/geologie";
const BRGM_RISKS="https://geoservices.brgm.fr/risques";
const baseDefs=[
 {id:"osm",label:"OpenStreetMap",type:"osm",source:"OpenStreetMap"},
 {id:"plan",label:"Plan IGN",url:IGN,layer:"GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2",source:"IGN"},
 {id:"aerial",label:"Photographies aériennes IGN",url:IGN,layer:"ORTHOIMAGERY.ORTHOPHOTOS",source:"IGN"}
];
const overlayDefs=[
 {id:"cadastre",label:"Parcelles cadastrales IGN",url:IGN,layer:"CADASTRALPARCELS.PARCELLAIRE_EXPRESS",source:"IGN",opacity:.8},
 {id:"geology",label:"Carte géologique BRGM 1:50 000",url:BRGM_GEO,layer:"SCAN_D_GEOL50",source:"BRGM",opacity:.65},
 {id:"nappe-sedim",label:"Remontée de nappe — terrain sédimentaire",url:BRGM_RISKS,layer:"REM_NAPPE_SEDIM",source:"BRGM / Géorisques",opacity:.65},
 {id:"nappe-socle",label:"Remontée de nappe — socle",url:BRGM_RISKS,layer:"REM_NAPPE_SOCLE",source:"BRGM / Géorisques",opacity:.65},
 {id:"argiles",label:"Retrait-gonflement des argiles",url:BRGM_RISKS,layer:"ALEARG",source:"BRGM / Géorisques",opacity:.60},
 {id:"cavites",label:"Cavités souterraines",url:BRGM_RISKS,layer:"CAVITE_LOCALISEE",source:"BRGM / Géorisques",opacity:.85},
 {id:"mouvements",label:"Mouvements de terrain",url:BRGM_RISKS,layer:"MVT_LOCALISE",source:"BRGM / Géorisques",opacity:.85}
];
const views=[
 {id:"situation",label:"Carte de situation",base:"plan",overlays:[]},
 {id:"cadastre",label:"Plan cadastral",base:"plan",overlays:["cadastre"]},
 {id:"aerial",label:"Vue aérienne",base:"aerial",overlays:["cadastre"]},
 {id:"flood",label:"Risques d’inondation",base:"plan",overlays:[],note:"Aucune couche locale d’inondation n’est fournie ici. Consulter la source Géorisques et le PPRI : ne pas conclure à l’absence de risque."},
 {id:"groundwater",label:"Remontée de nappe",base:"plan",overlays:["nappe-sedim","nappe-socle"]},
 {id:"environment",label:"Contraintes environnementales",base:"plan",overlays:["argiles","cavites","mouvements"]},
 {id:"geology",label:"Géologie BRGM",base:"plan",overlays:["geology"]},
 {id:"investigation",label:"Sondages / Porchet",base:"aerial",overlays:["cadastre"]},
 {id:"implantation",label:"Implantation ANC",base:"aerial",overlays:["cadastre"]},
 {id:"trenches",label:"Tranchées d’infiltration",base:"aerial",overlays:["cadastre"]},
 {id:"networks",label:"Réseaux existants",base:"aerial",overlays:["cadastre"]},
 {id:"evacuation",label:"Évacuation / exutoire",base:"aerial",overlays:["cadastre"]},
 {id:"works",label:"Travaux / terrassement",base:"aerial",overlays:["cadastre"]},
 {id:"synthesis",label:"Synthèse ANC",base:"plan",overlays:["cadastre"]}
];
const aliases={location:"situation",cadastral:"cadastre",layout:"implantation"};
const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));
const assetBase=new URL(".",document.currentScript?.src||location.href).href;
const study=()=>window.ANCRealWorkflow?.getStudy?.();
const mutate=fn=>window.ANCRealWorkflow?.mutateStudy?.(fn);
const num=v=>{if(v===undefined||v===null||String(v).trim()==="")return null;const n=Number(String(v).replace(",","."));return Number.isFinite(n)?n:null;};
const coordinates=()=>{
 const s=study(),f=s?.fields||{},lat=num(f["parcel.lat"]??s?.geolocation?.lat),lng=num(f["parcel.lng"]??s?.geolocation?.lng);
 return lat!==null&&lng!==null&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0)?[lat,lng]:null;
};
function status(message,warning=false){
 const el=$("#anc-live-map-status");
 if(el){el.textContent=message;el.style.color=warning?"#a13e23":"#265e48";}
}
function saveStatus(message,error=false){
 const n=$("#anc-map-save-result");
 if(n){n.textContent=message;n.dataset.status=error?"error":"success";}
 const toast=$("#public-toast");
 if(toast){toast.textContent=message;toast.hidden=false;}
 status(message,error);
}
function destroy(){
 if(map){try{map.remove();}catch(e){console.warn(e)}}
 map=null;marker=null;parcelLayer=null;pickerMarker=null;pickerMode=false;
 mapLayers={};activeOverlays.clear();layerErrors.clear();
}
function leaflet(){
 if(window.L?.map)return Promise.resolve(true);
 if(window.__ancLeafletPromise)return window.__ancLeafletPromise;
 window.__ancLeafletPromise=new Promise(resolve=>{
   const css=document.createElement("link");css.rel="stylesheet";css.href=assetBase+"leaflet.css";document.head.append(css);
   const script=document.createElement("script");script.src=assetBase+"leaflet.js";
   script.onload=()=>resolve(!!window.L?.map);script.onerror=()=>resolve(false);document.head.append(script);
 });
 return window.__ancLeafletPromise;
}
function makeLayer(d){
 if(d.type==="osm")return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
   maxZoom:19,attribution:"© OpenStreetMap contributors",crossOrigin:"anonymous"
 });
 return L.tileLayer.wms(d.url,{
   layers:d.layer,version:d.url===IGN?"1.3.0":"1.1.1",format:"image/png",
   transparent:overlayDefs.some(o=>o.id===d.id),
   opacity:d.opacity??1,attribution:d.source||d.label,maxZoom:20,
   crossOrigin:"anonymous"
 });
}
function configureLayers(){
 for(const d of [...baseDefs,...overlayDefs]){
   const layer=makeLayer(d),id=d.id;
   layer.on("tileerror",()=>{
     if(!layerErrors.has(id)){
       layerErrors.add(id);
       status("La couche « "+d.label+" » ne répond pas. La composition reste enregistrable ; vérifier la source avant édition.",true);
     }
   });
   mapLayers[id]=layer;
 }
}
function meta(){
 return {activeKind:activeView,base:activeBase,overlays:[...activeOverlays],
   opacity:Object.fromEntries(overlayDefs.map(d=>[d.id,activeOpacity[d.id]??d.opacity]))};
}
function remember(){
 if(!study()?.id||study().id!==activeStudyId)return;
 const v=meta();
 mutate(st=>{if(st.id===activeStudyId)st.mapView={...(st.mapView||{}),...v};});
}
function displayControls(){
 document.querySelectorAll("#geometrie [data-anc-map-view]").forEach(b=>{
   const on=b.dataset.ancMapView===activeView;
   b.classList.toggle("primary",on);b.classList.toggle("secondary",!on);
   b.setAttribute("aria-pressed",String(on));
 });
 const base=$("#anc-map-base");if(base)base.value=activeBase;
 document.querySelectorAll("[data-anc-overlay]").forEach(el=>{el.checked=activeOverlays.has(el.dataset.ancOverlay);});
 document.querySelectorAll("[data-anc-opacity]").forEach(el=>{
   const d=overlayDefs.find(x=>x.id===el.dataset.ancOpacity);
   const amount=activeOpacity[el.dataset.ancOpacity]??d?.opacity??.65;
   el.value=String(Math.round(amount*100));
   const value=el.parentElement?.querySelector("output");if(value)value.value=Math.round(amount*100)+" %";
 });
 const label=views.find(v=>v.id===activeView);
 const note=$("#anc-map-view-note");if(note)note.textContent=label?.note||"Les couches sont indicatives. Le plan final, les contraintes et les distances doivent être contrôlés par le bureau d’études.";
}
function showCurrentLayers(){
 if(!map)return;
 for(const layer of Object.values(mapLayers))if(map.hasLayer(layer))map.removeLayer(layer);
 (mapLayers[activeBase]||mapLayers.osm)?.addTo(map);
 for(const id of activeOverlays){
   const layer=mapLayers[id];if(layer){
     const def=overlayDefs.find(d=>d.id===id);
     layer.setOpacity?.(activeOpacity[id]??def?.opacity??.65);
     layer.addTo(map);
   }
 }
 if(parcelLayer&&!map.hasLayer(parcelLayer))parcelLayer.addTo(map);
 if(marker&&!map.hasLayer(marker))marker.addTo(map);
 if(pickerMarker&&!map.hasLayer(pickerMarker))pickerMarker.addTo(map);
 map.__ancView=activeView;
 displayControls();
}
function selectView(view,{rememberState=true}={}){
 const canonical=aliases[view]||view;
 const preset=views.find(v=>v.id===canonical);
 if(!preset)return false;
 activeView=preset.id;activeBase=preset.base;activeOverlays=new Set(preset.overlays);
 showCurrentLayers();
 if(rememberState)remember();
 status("Vue « "+preset.label+" ». "+(preset.note||"Activez les filtres pour superposer les données IGN/BRGM."));
 return true;
}
function setBase(id){
 if(!baseDefs.some(d=>d.id===id))return;
 activeBase=id;showCurrentLayers();remember();
 status("Fond de carte modifié. Il sera conservé dans la composition enregistrée.");
}
function toggleOverlay(id,on){
 if(!overlayDefs.some(d=>d.id===id))return;
 if(on)activeOverlays.add(id);else activeOverlays.delete(id);
 showCurrentLayers();remember();
 status("Filtre "+(on?"activé":"désactivé")+" : "+overlayDefs.find(d=>d.id===id).label+".");
}
function setOpacity(id,value){
 if(!overlayDefs.some(d=>d.id===id))return;
 const n=Math.min(100,Math.max(10,Number(value)||70))/100;
 activeOpacity[id]=n;
 if(mapLayers[id])mapLayers[id].setOpacity(n);
 displayControls();remember();
}
function restoreView(){
 const v=study()?.mapView;
 if(v&&views.some(x=>x.id===(aliases[v.activeKind]||v.activeKind))){
   activeView=aliases[v.activeKind]||v.activeKind;
   activeBase=baseDefs.some(d=>d.id===v.base)?v.base:"aerial";
   activeOverlays=new Set(Array.isArray(v.overlays)?v.overlays.filter(id=>overlayDefs.some(d=>d.id===id)):[]);
   activeOpacity={...(v.opacity||{})};
   showCurrentLayers();
 }else{
   activeOpacity={};selectView("implantation",{rememberState:false});
 }
}
function viewButtons(){
 return views.map(v=>'<button type="button" class="btn secondary small" aria-pressed="false" data-anc-map-view="'+v.id+'">'+esc(v.label)+'</button>').join("");
}
function filterMarkup(){
 return '<div class="anc-map-filter-area"><label class="field">Fond de carte'+
   '<select id="anc-map-base" class="select">'+baseDefs.map(d=>'<option value="'+d.id+'">'+esc(d.label)+'</option>').join("")+'</select></label>'+
   '<div class="anc-map-filter-list">'+overlayDefs.map(d=>'<div class="anc-map-filter-line"><label>'+
   '<input type="checkbox" data-anc-overlay="'+d.id+'"> '+esc(d.label)+'</label>'+
   '<label class="anc-map-opacity-label">Opacité <input type="range" min="10" max="100" step="5" data-anc-opacity="'+d.id+'" value="'+Math.round(d.opacity*100)+'">'+
   '<output>'+Math.round(d.opacity*100)+' %</output></label></div>').join("")+'</div></div>';
}
function mount(section){
 if(!section||!["dossier","geometrie"].includes(section.id)){destroy();activeSection=null;activeStudyId=null;return;}
 destroy();activeSection=section.id;activeStudyId=study()?.id||null;
 let target;
 if(section.id==="dossier")target=section.querySelector(".geo-map-frame");
 else {
   const holder=document.createElement("article");holder.className="card anc-real-map-card";
   holder.innerHTML='<header class="card-head"><div><h2>Plans et métrés — cartographie du dossier</h2>'+
   '<p>14 vues disponibles. Superposez les couches IGN/BRGM, ajustez leur transparence puis enregistrez votre composition.</p></div></header>'+
   '<div class="card-body"><div class="anc-map-presets" id="anc-map-presets">'+viewButtons()+'</div>'+
   '<details class="anc-map-layers-detail" open><summary><strong>Fonds et filtres cartographiques — IGN, BRGM, Géorisques</strong></summary>'+filterMarkup()+'</details>'+
   '<p class="anc-map-view-note" id="anc-map-view-note"></p><div class="anc-real-map-target"></div>'+
   '<div class="anc-map-save-bar"><button type="button" class="btn primary" data-anc-map-save="1">Enregistrer cette carte dans le dossier</button>'+
   '<button type="button" class="btn secondary" data-anc-map-open-gallery="1">Voir les cartes enregistrées</button>'+
   '<span class="anc-map-save-result" role="status" id="anc-map-save-result" data-status="pending">Les calques et le cadrage seront conservés par dossier.</span></div></div>';
   section.querySelector(".section-head")?.insertAdjacentElement("afterend",holder);
   target=holder.querySelector(".anc-real-map-target");
   const old=section.querySelector("#anc-v3-live-map");
   if(old){old.hidden=true;old.setAttribute("aria-hidden","true");}
 }
 if(!target)return;
 target.classList.add("anc-real-map-target");
 target.innerHTML='<p id="anc-live-map-status" role="status">Chargement de la carte…</p>'+
   '<button type="button" class="btn secondary small" data-anc-map-pick="1" aria-pressed="false">📍 Déplacer le point / choisir une autre parcelle</button>'+
   '<p class="anc-map-pick-help">Si l’adresse situe une autre parcelle, cliquez sur le bon terrain puis confirmez la référence proposée.</p>'+
   '<div class="anc-map-canvas" role="application" aria-label="Carte interactive du dossier"></div>'+
   '<div class="anc-map-selection-panel" aria-live="polite"></div>';
 const canvas=target.querySelector(".anc-map-canvas"),mountedSection=section.id,mountedStudyId=activeStudyId;
 leaflet().then(ok=>{
   if(!target.isConnected||activeSection!==mountedSection||activeStudyId!==mountedStudyId)return;
   if(!ok){status("Bibliothèque de cartographie indisponible.",true);return;}
   const coords=coordinates(),savedView=study()?.mapView;
   const savedCenter=Array.isArray(savedView?.center)&&savedView.center.length===2&&savedView.center.every(n=>Number.isFinite(Number(n)))?savedView.center:null;
   const center=savedCenter||coords||[46.6,2.3];
   const zoom=Number.isFinite(Number(savedView?.zoom))?Math.min(20,Math.max(3,Number(savedView.zoom))):coords?18:6;
   map=L.map(canvas,{zoomControl:true,scrollWheelZoom:false}).setView(center,zoom);
   map.on("click",event=>{if(pickerMode)previewPoint(event.latlng.lat,event.latlng.lng);});
   configureLayers();restoreView();
   L.control.scale({metric:true,imperial:false,position:"bottomleft"}).addTo(map);
   if(coords){
     marker=L.marker(coords,{draggable:false}).addTo(map).bindPopup("Position du chantier — à confirmer");
     marker.on("dragend",()=>{if(pickerMode){const p=marker.getLatLng();previewPoint(p.lat,p.lng);}});
   }
   if(study()?.cadastralGeometry)showParcel(study().cadastralGeometry);
   status(coords?"Carte active : choisissez vos filtres, puis enregistrez votre composition.":"Localisez votre dossier ou déplacez la carte vers le site avant d'enregistrer.");
   setTimeout(()=>{if(map)map.invalidateSize();},100);
 });
}
function refresh(){
 if(!map)return;
 const coords=coordinates();if(!coords)return;
 map.setView(coords,18);
 if(marker)marker.setLatLng(coords);
 else{
   marker=L.marker(coords,{draggable:pickerMode}).addTo(map).bindPopup("Position du chantier — à confirmer");
   marker.on("dragend",()=>{if(pickerMode){const p=marker.getLatLng();previewPoint(p.lat,p.lng);}});
 }
 status("Position du dossier : "+coords[0].toFixed(5)+", "+coords[1].toFixed(5)+".");
}
function showParcel(geojson){
 if(!map||!geojson)return;
 try{
   if(parcelLayer)map.removeLayer(parcelLayer);
   parcelLayer=L.geoJSON(geojson,{style:{color:"#006be8",weight:3,fillColor:"#3a9ced",fillOpacity:.17}}).addTo(map);
   const bounds=parcelLayer.getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(.2));
   status("Contour cadastral IGN : vérifier la référence sur le terrain.");
 }catch(err){status("Contour de parcelle indisponible.",true);}
}
function previewPoint(lat,lng){
 if(!map||!pickerMode||!Number.isFinite(lat)||!Number.isFinite(lng))return;
 if(pickerMarker)map.removeLayer(pickerMarker);
 pickerMarker=L.circleMarker([lat,lng],{radius:8,color:"#dc6418",weight:3,fillOpacity:.35}).addTo(map);
 status("Point sélectionné : "+lat.toFixed(6)+", "+lng.toFixed(6)+". Confirmer la parcelle proposée.");
 const panel=$(".anc-map-selection-panel");if(panel)panel.textContent="Recherche des références cadastrales IGN…";
 window.ANCGeoParcel?.proposeMapPoint?.(lat,lng);
}
function enableParcelPicker(on){
 if(!map)return false;
 pickerMode=!!on;
 const button=$("[data-anc-map-pick]");
 if(button){button.setAttribute("aria-pressed",String(pickerMode));
   button.textContent=pickerMode?"Annuler la sélection de parcelle":"📍 Déplacer le point / choisir une autre parcelle";}
 if(marker?.dragging){if(pickerMode)marker.dragging.enable();else marker.dragging.disable();}
 map.getContainer().style.cursor=pickerMode?"crosshair":"";
 if(!pickerMode){
   if(pickerMarker)map.removeLayer(pickerMarker);pickerMarker=null;
   const panel=$(".anc-map-selection-panel");if(panel)panel.replaceChildren();
 }
 status(pickerMode?"Cliquez dans la parcelle voulue ou déplacez le repère. Aucun changement avant confirmation.":"Sélection annulée.");
 return true;
}
function finishParcelPick(){if(map)enableParcelPicker(false);}
function clearParcel(){if(map&&parcelLayer)map.removeLayer(parcelLayer);parcelLayer=null;}
function previewUrl(bbox){
 // Référence WMS illustrative, pas une capture archivée et pas forcément composée.
 const id=activeOverlays.has("geology")?"geology":activeOverlays.has("nappe-sedim")?"nappe-sedim":
   activeBase==="aerial"?"aerial":activeBase==="plan"?"plan":"cadastre";
 const def=[...baseDefs,...overlayDefs].find(d=>d.id===id);
 const base=def?.url||IGN,layer=def?.layer||"GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2";
 const params=new URLSearchParams({SERVICE:"WMS",VERSION:"1.1.1",REQUEST:"GetMap",
   SRS:"EPSG:4326",FORMAT:"image/png",TRANSPARENT:"FALSE",WIDTH:"900",HEIGHT:"650",
   LAYERS:layer,BBOX:bbox.join(",")});
 return base+"?"+params.toString();
}
function saveMap(){
 const s=study();
 if(!map||!s?.id||s.id!==activeStudyId){saveStatus("Impossible d'enregistrer : aucun dossier ou carte active.",true);return;}
 const b=map.getBounds();
 if(!b.isValid()){saveStatus("Le cadrage cartographique n'est pas valide.",true);return;}
 const m=meta(),center=map.getCenter(),bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];
 const view=views.find(v=>v.id===activeView),id="anc_map_"+Date.now()+"_"+Math.random().toString(36).slice(2,6);
 const record={
   id,kind:activeView,label:view?.label||activeView,source:[...new Set([
     baseDefs.find(d=>d.id===activeBase)?.source,
     ...[...activeOverlays].map(id=>overlayDefs.find(d=>d.id===id)?.source)
   ].filter(Boolean))].join(" + "),
   base:m.base,overlays:m.overlays,opacity:m.opacity,
   center:[center.lat,center.lng],bounds,zoom:map.getZoom(),
   url:previewUrl(bounds),imageArchived:false,
   studyId:s.id,parcelReference:[s.fields?.["parcel.section"],s.fields?.["parcel.number"]].filter(Boolean).join(" "),
   status:coordinates()?"TO_CONFIRM":"TO_LOCALIZE",savedAt:new Date().toISOString()
 };
 mutate(st=>{
   if(st.id!==activeStudyId)return;
   st.maps=Array.isArray(st.maps)?st.maps:[];
   st.maps.push(record);
   st.mapView={...(st.mapView||{}),...m,center:[center.lat,center.lng],bounds,zoom:map.getZoom()};
 });
 const exists=(study()?.maps||[]).some(x=>x.id===record.id&&x.base===record.base&&x.overlays?.length===record.overlays.length);
 if(!exists){saveStatus("Échec de sauvegarde : espace local indisponible ou plein. Exportez le dossier JSON.",true);return;}
 const count=(study()?.maps||[]).length;
 saveStatus("✓ « "+record.label+" » enregistré dans le dossier ("+count+" carte"+(count>1?"s":"")+"). Retrouvable dans Cartes dossier.");
}
function handle(event){
 const b=event.target.closest("button");if(!b)return false;
 if(b.dataset.ancMapPick!==undefined){enableParcelPicker(!pickerMode);return true;}
 if(b.dataset.ancMapView!==undefined){selectView(b.dataset.ancMapView);return true;}
 if(b.classList.contains("axis-plan-switch")&&b.dataset.kind){selectView(b.dataset.kind);return true;}
 if(b.dataset.ancMapSave!==undefined){saveMap();return true;}
 if(b.dataset.ancMapOpenGallery!==undefined){window.ANCPublicNavigate?.("cartes");return true;}
 return false;
}
document.addEventListener("change",event=>{
 const el=event.target;
 if(el?.id==="anc-map-base")setBase(el.value);
 if(el?.dataset?.ancOverlay!==undefined)toggleOverlay(el.dataset.ancOverlay,el.checked);
 if(el?.dataset?.ancOpacity!==undefined)setOpacity(el.dataset.ancOpacity,el.value);
});
document.addEventListener("input",event=>{
 const el=event.target;
 if(el?.dataset?.ancOpacity!==undefined){
   const n=el.parentElement?.querySelector("output");if(n)n.value=el.value+" %";
   if(mapLayers[el.dataset.ancOpacity])mapLayers[el.dataset.ancOpacity].setOpacity((Number(el.value)||60)/100);
 }
});
window.ANCMapRuntime={
 mount,refresh,showParcel,selectView,handle,clearParcel,finishParcelPick,
 definitions:{bases:baseDefs,overlays:overlayDefs,views}
};
})();