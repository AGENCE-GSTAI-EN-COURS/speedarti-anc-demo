/* ANC public — cartographie réellement interactive, aucune formule ANC privée. */
(()=>{
"use strict";
let map=null, marker=null,parcelLayer=null, activeSection=null, activeStudyId=null, mapLayers={};
const assetBase=new URL(".",document.currentScript?.src||location.href).href;
const $=q=>document.querySelector(q);
const study=()=>window.ANCRealWorkflow?.getStudy?.();
const numerical=x=>{if(x===null||x===undefined||x==="")return null;const n=Number(x);return Number.isFinite(n)?n:null};
const coordinates=()=>{
 const s=study();const f=s?.fields||{};
 const lat=numerical(f["parcel.lat"]??s?.geolocation?.lat);
 const lng=numerical(f["parcel.lng"]??s?.geolocation?.lng);
 return lat!==null&&lng!==null&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0)?[lat,lng]:null;
};
const status=(message,warning=false)=>{
 const el=$("#anc-live-map-status");if(!el)return;
 el.textContent=message;el.style.color=warning?"#9b341e":"#215d49";
};
function destroy(){
 if(map){try{map.remove()}catch(e){console.warn(e)}}
 map=null;marker=null;parcelLayer=null;mapLayers={};
}
function loadLeaflet(){
 if(window.L?.map)return Promise.resolve(true);
 if(window.__ancLeafletPromise)return window.__ancLeafletPromise;
 window.__ancLeafletPromise=new Promise(resolve=>{
   const css=document.createElement("link");css.rel="stylesheet";css.href=assetBase+"leaflet.css";document.head.appendChild(css);
   const script=document.createElement("script");script.src=assetBase+"leaflet.js";script.onload=()=>resolve(!!window.L?.map);script.onerror=()=>resolve(false);document.head.appendChild(script);
 });
 return window.__ancLeafletPromise;
}
function mount(section){
 if(!section||!["dossier","geometrie"].includes(section.id)){destroy();activeSection=null;return}
 destroy();activeSection=section.id;activeStudyId=study()?.id||null;
 let target;
 if(section.id==="dossier")target=section.querySelector(".geo-map-frame");
 else {
   const holder=document.createElement("article");holder.className="card anc-real-map-card";
   holder.innerHTML='<header class="card-head"><div><h2>🗺️ Plans et métrés — vues cartographiques</h2><p>Choisissez une vue : localisation, cadastre, aérien, BRGM ou implantation. Les métrés réglementaires du moteur privé ne sont pas encore déployés ici.</p></div></header><div class="card-body"><div class="anc-map-tabs"><button type="button" class="btn secondary" data-anc-map-view="situation">Situation</button><button type="button" class="btn secondary" data-anc-map-view="cadastre">Cadastre</button><button type="button" class="btn secondary" data-anc-map-view="aerial">Vue aérienne</button><button type="button" class="btn secondary" data-anc-map-view="geology">BRGM</button><button type="button" class="btn primary" data-anc-map-view="implantation">Implantation ANC</button></div><div class="anc-real-map-target"></div><button type="button" class="btn primary" data-anc-map-save="1">Enregistrer cette vue dans Cartes du dossier</button></div>';
   section.querySelector(".section-head")?.insertAdjacentElement("afterend",holder);
   target=holder.querySelector(".anc-real-map-target");
   const old=section.querySelector("#anc-v3-live-map");
   if(old){old.hidden=true;old.setAttribute("aria-hidden","true")}
 }
 if(!target)return;
 target.classList.add("anc-real-map-target");
 target.innerHTML='<p id="anc-live-map-status" role="status">Chargement de la carte…</p><div class="anc-map-canvas" role="application" aria-label="Carte interactive du dossier"></div>';
 const canvas=target.querySelector(".anc-map-canvas");
 const mountedSection=section.id;
 loadLeaflet().then(ok=>{
   if(!target.isConnected||activeSection!==mountedSection)return;
   if(!ok){status("Fond de carte indisponible : le service cartographique n’a pas pu être chargé.",true);return}
   const coords=coordinates();
   const center=coords||[46.6,2.3];
   map=L.map(canvas,{zoomControl:true,scrollWheelZoom:false}).setView(center,coords?18:6);
   const osm=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
     maxZoom:19,attribution:"© OpenStreetMap contributors"
   }).addTo(map);
   const ortho=L.tileLayer.wms("https://data.geopf.fr/wms-r/wms",{
     layers:"ORTHOIMAGERY.ORTHOPHOTOS",format:"image/jpeg",transparent:false,version:"1.3.0",
     attribution:"IGN — Géoplateforme",maxZoom:20
   });
   const cadastre=L.tileLayer.wms("https://data.geopf.fr/wms-r/wms",{
     layers:"CADASTRALPARCELS.PARCELLAIRE_EXPRESS",format:"image/png",transparent:true,version:"1.3.0",
     attribution:"IGN — cadastre",maxZoom:20
   }).addTo(map);
   const geology=L.tileLayer.wms("https://geoservices.brgm.fr/geologie",{
     layers:"SCAN_D_GEOL50",format:"image/png",transparent:true,version:"1.1.1",attribution:"BRGM — carte géologique 1:50 000",maxZoom:18
   });
   mapLayers={osm,ortho,cadastre,geology};
   L.control.layers({"OpenStreetMap":osm,"Orthophoto IGN":ortho},{"Cadastre IGN":cadastre,"Carte géologique BRGM":geology},{collapsed:false}).addTo(map);
   for(const layer of [osm,ortho,cadastre,geology])layer.on("tileerror",()=>status("Une couche cartographique ne répond pas. Essayer un autre fond ou vérifier la connexion.",true));
   if(coords){marker=L.marker(coords).addTo(map).bindPopup("Position du chantier — à confirmer");status("Carte centrée sur le dossier. Détection cadastrale à confirmer.");}
   if(study()?.cadastralGeometry)showParcel(study().cadastralGeometry);
   else status("Carte active. Renseignez une adresse réelle puis cliquez sur « Localiser depuis l’adresse ».");
   setTimeout(()=>{if(map)map.invalidateSize()},100);
 });
}
function refresh(){
 const coords=coordinates();if(!map||!coords)return;
 map.setView(coords,18);
 if(marker)marker.setLatLng(coords);
 else marker=L.marker(coords).addTo(map).bindPopup("Position du chantier — à confirmer");
 status("Position mise à jour : "+coords[0].toFixed(5)+", "+coords[1].toFixed(5)+".");
}
function showParcel(geojson){
 if(!map||!geojson)return;
 try{
   if(parcelLayer)map.removeLayer(parcelLayer);
   parcelLayer=L.geoJSON(geojson,{style:{color:"#006be8",weight:3,fillColor:"#3a9ced",fillOpacity:.17}}).addTo(map);
   const bounds=parcelLayer.getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(.2));
   status("Contour cadastral IGN affiché — à confirmer sur le terrain.");
 }catch(err){status("La parcelle a été détectée, mais son contour ne peut pas être affiché.",true);}
}
function selectView(view){
 if(!map)return false;
 const {osm,ortho,cadastre,geology}=mapLayers;
 for(const layer of [osm,ortho,cadastre,geology])if(layer&&map.hasLayer(layer))map.removeLayer(layer);
 if(view==="aerial"||view==="implantation"){ortho.addTo(map);cadastre.addTo(map);}
 else if(view==="geology"){osm.addTo(map);geology.addTo(map);}
 else if(view==="cadastre"){osm.addTo(map);cadastre.addTo(map);}
 else osm.addTo(map);
 map.__ancView=view;
 status("Vue "+view+" : sources officielles à contrôler, données indicatives.");
 return true;
}
function handle(event){
 const view=event.target.closest("[data-anc-map-view]");
 if(view){selectView(view.dataset.ancMapView);return true;}
 const save=event.target.closest("[data-anc-map-save]");
 if(save){
   const s=study(),f=s?.fields||{},lat=Number(f["parcel.lat"]),lng=Number(f["parcel.lng"]);
   if(!map||!Number.isFinite(lat)||!Number.isFinite(lng)||!f["parcel.lat"]||!f["parcel.lng"]){status("Position du dossier requise pour enregistrer une carte.",true);return true;}
   const view=map.__ancView||"implantation";
   const bounds=map.getBounds(),b=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()];
   const remote=view==="geology";
   const url=(remote?"https://geoservices.brgm.fr/geologie":"https://data.geopf.fr/wms-r/wms")+
     "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&SRS=EPSG%3A4326&FORMAT=image%2Fpng&TRANSPARENT=TRUE&WIDTH=900&HEIGHT=650&LAYERS="+
     encodeURIComponent(view==="geology"?"SCAN_D_GEOL50":view==="aerial"?"ORTHOIMAGERY.ORTHOPHOTOS":view==="situation"?"GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2":"CADASTRALPARCELS.PARCELLAIRE_EXPRESS")+
     "&BBOX="+encodeURIComponent(b.join(","));
   window.ANCRealWorkflow?.mutateStudy?.(st=>{
     st.maps=Array.isArray(st.maps)?st.maps:[];
     st.maps=st.maps.filter(x=>x.kind!==view);
     st.maps.push({kind:view,url,source:remote?"BRGM":"IGN",status:"TO_CONFIRM",savedAt:new Date().toISOString(),center:[lat,lng],bounds:b});
   });
   status("Vue "+view+" enregistrée comme référence cartographique du dossier, à vérifier dans Cartes du dossier.");
   return true;
 }
 return false;
}
window.ANCMapRuntime={mount,refresh,showParcel,selectView,handle};
})();
