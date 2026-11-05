/* ANC public — cartographie réellement interactive, aucune formule ANC privée. */
(()=>{
"use strict";
let map=null, marker=null,parcelLayer=null, activeSection=null, activeStudyId=null;
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
 map=null;marker=null;parcelLayer=null;
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
   holder.innerHTML='<header class="card-head"><div><h2>🗺️ Carte réelle du dossier ANC</h2><p>Fond OpenStreetMap, orthophoto IGN, cadastre IGN. Dessin réglementaire et mesures du moteur privé non disponibles ici.</p></div></header><div class="card-body"><div class="anc-real-map-target"></div></div>';
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
   L.control.layers({"OpenStreetMap":osm,"Orthophoto IGN":ortho},{"Cadastre IGN":cadastre},{collapsed:false}).addTo(map);
   for(const layer of [osm,ortho,cadastre])layer.on("tileerror",()=>status("Une couche cartographique ne répond pas. Essayer un autre fond ou vérifier la connexion.",true));
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
window.ANCMapRuntime={mount,refresh,showParcel};
})();
