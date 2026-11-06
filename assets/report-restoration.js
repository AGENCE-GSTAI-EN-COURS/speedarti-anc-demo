/* SpeedArti ANC — restitution du rapport complet, sans code métier confidentiel.
 * Chaque feuille n'emploie que les données réellement présentes dans ce dossier local.
 * Les calculs et conclusions professionnels restent explicitement à valider.
 */
(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const plain=v=>String(v??"").trim();
const safe=v=>plain(v)?esc(v):'<span class="anc-blank">À renseigner</span>';
const get=()=>window.ANCRealWorkflow?.getStudy?.();
const fmt=x=>typeof x==="number"?new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2}).format(x):safe(x);
const date=v=>{if(!v)return"À renseigner";const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString("fr-FR"):String(v)};
const value=(f,...keys)=>{for(const k of keys){const x=f[k];if(x!==undefined&&x!==null&&String(x).trim()!=="")return x}return""};
const pair=(label,data)=>'<tr><th>'+esc(label)+'</th><td>'+safe(data)+'</td></tr>';
const info=(data)=>'<table class="anc-report-kv"><tbody>'+data.map(([a,b])=>pair(a,b)).join("")+'</tbody></table>';
const notice='<div class="anc-report-notice">SPÉCIMEN DE TRAVAIL — Données et conclusions à valider par le bureau d’études. Toute case non renseignée reste explicitement indéterminée. Ce document ne constitue ni une étude ANC signée ni un avis de conformité.</div>';
const validation='<p class="anc-report-proof">Statut : document de démonstration non validé. Les sources et dates doivent être contrôlées ; les observations, dimensions, distances et préconisations restent sous la responsabilité du professionnel.</p>';
const titleOf=(f,st)=>plain(value(f,"title"))||st.name||"Étude ANC";
const owner=f=>[value(f,"owner.civility"),value(f,"owner.firstName"),value(f,"owner.lastName")].filter(x=>String(x).trim()).join(" ");
const address=f=>[value(f,"parcel.address"),value(f,"parcel.postalCode"),value(f,"parcel.city")].filter(x=>String(x).trim()).join(", ");
const fmtSource=s=>s?.source||s?.origin||"Non vérifiée";
function tab(headers,rows){
 const h='<tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr>';
 const body=rows.length?rows:[[...headers.map(()=> "")]];
 return '<table class="anc-report-kv"><thead>'+h+'</thead><tbody>'+body.map(row=>'<tr>'+row.map(v=>'<td>'+safe(v)+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
}
function boreholes(s){
 return (s.cells?.sondages||[]).map((entry,i)=>{
   const f=entry.fields||{},pick=(regex)=>Object.entries(f).find(([k])=>regex.test(k))?.[1]||"";
   const name=pick(/\.label$/)||"S"+(i+1),depth=pick(/\.depth$/),className=pick(/\.classification$/);
   const horizons=Object.entries(f).filter(([k,v])=>/horizons\.\d+\./.test(k)&&v!==undefined&&v!=="");
   const groups=new Map();
   for(const [k,v] of horizons){const m=k.match(/horizons\.(\d+)\.(.+)$/);if(m){const id=m[1];groups.set(id,{...(groups.get(id)||{}),[m[2]]:v});}}
   return {name,depth,className,horizons:[...groups.entries()].sort((a,b)=>+a[0]-+b[0]).map(([n,fields])=>({number:+n+1,...fields}))};
 });
}
function porchetSheets(s){
 let sheets={};try{sheets=JSON.parse(s.porchet||"{}").sheets||{}}catch{}
 return ["KP1","KP2","KP3","KP4"].map(key=>{
   const data=sheets[key];if(!data)return null;
   const calculate=window.ANCPorchetExcel?.calculate;
   let result=null;try{result=calculate?.(data)||null}catch{}
   return {key,data,result};
 }).filter(Boolean);
}
function chapter(id,title,content,kind="body"){
 return {id,title,content,kind};
}
function build(st){
 const f=st.fields||{},parcels=Array.isArray(st.parcels)?st.parcels:[],
       maps=Array.isArray(st.maps)?st.maps:[],src=st.sources||{},
       surveys=boreholes(st),tests=porchetSheets(st),ter=st.terrainSources||{};
 const person=owner(f),where=address(f),ref=value(f,"reference")||st.id,office=value(f,"company.name")||"Bureau d’études — à identifier";
 const parcelRows=parcels.filter(p=>p.section||p.number||p.area).map(p=>[p.section,p.number,p.area,p.source||"À confirmer"]);
 const surveyRows=surveys.map(x=>[x.name,x.depth,x.className,x.horizons.length+" horizon(s) saisi(s)"]);
 const testRows=tests.map(x=>{
   const r=x.result||{};
   return [x.key,r.mean===null||r.mean===undefined?"Non calculé":String(r.mean)+" mm/h",r.graphical===null||r.graphical===undefined?"Non calculé":String(r.graphical)+" mm/h",
     r.complete?"Calcul provisoire — validation Fred obligatoire":"Données incomplètes"];
 });
 const savedMap=kind=>maps.find(m=>m.kind===kind||(kind==="situation"&&m.kind==="location")||(kind==="cadastre"&&m.kind==="cadastral")||(kind==="implantation"&&m.kind==="layout"));
 const chapters=[];
 chapters.push(chapter("couverture","RAPPORT D’ÉTUDE DE CONCEPTION — ASSAINISSEMENT NON COLLECTIF",
   '<div style="margin-top:30mm;text-align:center"><div style="font-size:14pt;color:#2468a0;font-weight:bold">SpeedArti — Études ANC</div>'+
   '<h2 style="font-size:19pt;margin:16mm 0 13mm">'+safe(titleOf(f,st))+'</h2>'+
   '<p><strong>Demandeur</strong> — '+safe(person)+'</p><p><strong>Adresse du projet</strong> — '+safe(where)+'</p>'+
   '<p><strong>Parcelle(s)</strong> — '+safe(parcels.map(p=>[p.section,p.number].filter(Boolean).join(" ")).filter(Boolean).join(", "))+'</p>'+
   '<p><strong>Référence</strong> — '+safe(ref)+'</p><p><strong>Date de visite</strong> — '+safe(value(f,"visit.studyDate"))+'</p></div>'+
   '<div style="margin-top:20mm">'+notice+'</div>',"cover"));
 chapters.push(chapter("sommaire","SOMMAIRE",'<div id="anc-report-toc-placeholder"></div>'));
 chapters.push(chapter("mission","Objet de l’étude et limites de la mission",
   '<p>Étude préalable à la conception d’une installation d’assainissement non collectif. Les résultats sont à compléter par les observations terrain et les vérifications réglementaires du bureau d’études.</p>'+
   info([["Référence du dossier",ref],["Maître d’ouvrage",person],["Commune",value(f,"parcel.city")],["Nature des travaux",value(f,"project.workType","visit.workType")],["Date de visite",value(f,"visit.studyDate")]])+
   '<h2>Références applicables</h2><p>Les textes, normes et prescriptions du SPANC doivent être vérifiés dans leurs versions en vigueur à la date de signature. Aucune conformité n’est attestée par cette démo.</p>'+validation));
 chapters.push(chapter("bureau","Identification du bureau d’études",
   info([["Bureau d’études",office],["Adresse",value(f,"company.address")],["Téléphone",value(f,"company.phone")],["E-mail",value(f,"company.email")],["Identifiant légal",value(f,"company.legal")],["Technicien",value(f,"visit.technician")],["Référence",ref]])+
   '<p>Les coordonnées du bureau et du technicien doivent être configurées avant émission d’un rapport professionnel.</p>'));
 chapters.push(chapter("client","1. Identification de la demande",
   info([["Nom du demandeur",person],["Société",value(f,"owner.company")],["Téléphone",value(f,"owner.phone")],["E-mail",value(f,"owner.email")],["Adresse de la parcelle",where],["Référence dossier",ref],["Cadre de la demande",value(f,"project.mission","project.type")]])+
   '<p>Toutes les informations client proviennent de la fiche du dossier courant. Aucun client fictif n’est ajouté si une donnée manque.</p>'));
 chapters.push(chapter("parcelles","1.1 Identification cadastrale",
   '<p>Références cadastrales renseignées ou détectées sur la parcelle sélectionnée. Le contour et la contenance doivent être confirmés avec les données officielles.</p>'+
   tab(["Section","Numéro","Surface (m²)","Provenance"],parcelRows)+
   info([["Surface cadastrale totale (m²)",value(f,"parcel.totalArea")],["Surface potentiellement disponible ANC (m²)",value(f,"parcel.availableArea")],["Latitude WGS84",value(f,"parcel.lat")],["Longitude WGS84",value(f,"parcel.lng")]])+
   '<p>La surface disponible ANC n’est jamais déduite automatiquement de la surface cadastrale seule.</p>'));
 chapters.push(chapter("habitation","1.2 Habitation et dimensionnement initial",
   info([["Pièces principales",value(f,"building.mainRooms")],["Occupants",value(f,"building.occupants")],["Usage",value(f,"building.use")],["Type d’habitation",value(f,"building.type")],["Projet neuf ou réhabilitation",value(f,"project.workType")],["Équivalent-habitants retenu",value(f,"design.eh")]])+
   '<p>Le dimensionnement final dépend des règles en vigueur et de la validation professionnelle ; il ne peut être déterminé à partir des seules données cadastrales.</p>'+validation));
 chapters.push(chapter("visite","1.3 Visite terrain et accès",
   info([["Date",value(f,"visit.studyDate")],["Technicien",value(f,"visit.technician")],["Météo observée",value(f,"visit.weather")],["Observations terrain",value(f,"visit.notes")],["Topographie",value(f,"parcel.topography")],["Accès et contraintes chantier",value(f,"terrain.access")]])+
   '<p>Les observations directes sont distinguées des données publiques ou issues de modèles.</p>'));
 chapters.push(chapter("topographie","1.4 Topographie, altitude et pente",
   info([["Altitude au point (m)",value(f,"parcel.altitude")],["Origine de l’altitude",ter.altitude?.origin==="IGN"?"IGN RGE ALTI — cote indicative":ter.altitude?.origin==="manual"?"Saisie manuelle":"Non documentée"],
     ["Pente moyenne (%)",value(f,"parcel.slope")],["Orientation de pente",value(f,"parcel.slopeDirection")],["Surface ANC estimée (m²)",value(f,"parcel.availableArea")],["Origine surface ANC",ter.availableArea?.origin==="estimate"?"Estimation à partir des surfaces occupées/exclues":ter.availableArea?.origin==="manual"?"Mesure déclarée":"Non déterminée"]])+
   '<p>Une altitude ponctuelle ne suffit pas à calculer la pente du terrain. La surface ANC utilisable exige de relever les emprises, reculs et contraintes.</p>'));
 chapters.push(chapter("risques","1.5 Contexte environnemental et risques",
   info([["Statut Géorisques",src.risks?.summary],["Source",src.risks?.source],["Date de consultation",src.risks?.checkedAt?date(src.risks.checkedAt):""],
     ["Contraintes environnementales",value(f,"environment.constraints","terrain.constraints")]])+
   '<p>L’absence de résultat du service externe ne démontre pas l’absence de risque. Vérifier toutes les données auprès des sources officielles et en visite de terrain.</p>'));
 chapters.push(chapter("meteo","1.6 Météo et conditions d’étude",
   info([["Date des données",src.weather?.date],["Synthèse météo",src.weather?.summary||value(f,"visit.weather")],["Fournisseur",src.weather?.source],
     ["Consultation",src.weather?.checkedAt?date(src.weather.checkedAt):""],["Contexte de visite",value(f,"visit.notes")]])+
   '<p>Les valeurs modélisées ne remplacent pas les observations pluviométriques et les essais réalisés au moment de la visite.</p>'));
 chapters.push(chapter("brgm","1.7 Géologie et contexte BRGM",
   info([["Code formation",value(f,"parcel.geologyCode")],["Notice géologique",value(f,"parcel.geologyNotice")],
     ["Description géologique",value(f,"parcel.geologyText")],["Données cartographiques",src.geology?.summary],
     ["Provenance",src.geology?.source]])+
   '<p>La carte géologique BRGM est un document de contexte. Les horizons réellement rencontrés sont décrits dans les sondages et doivent être validés par le professionnel.</p>'));
 chapters.push(chapter("sondages","2. Synthèse des sondages pédologiques",
   tab(["Sondage","Profondeur","Classification","Horizons"],surveyRows)+
   '<p>Nombre de sondages enregistrés dans ce dossier : <strong>'+surveys.length+'</strong>.</p>'+
   (surveys.length?"<p>Les fiches détaillées suivent, une page par sondage.</p>":'<p class="anc-report-notice">Aucun sondage enregistré pour ce dossier. L’étude pédologique est incomplète.</p>')));
 for(const s of surveys.slice(0,20)){
   chapters.push(chapter("sondage-"+s.name,"2.1 Fiche de sondage — "+s.name,
     info([["Repère",s.name],["Profondeur",s.depth],["Classification",s.className]])+
     tab(["Horizon","Profondeur début","Profondeur fin","Nature / observations"],
       s.horizons.map(h=>[h.number,h.from??"",h.to??"",h.soil??h.type??h.description??""]))+
     '<p>Vérifier les limites d’horizons, l’hydromorphie, la granulométrie et les observations in situ.</p>'+validation));
 }
 chapters.push(chapter("porchet-intro","2.2 Essais de perméabilité — Porchet",
   tab(["Référence","K moyen","K graphique","Statut"],testRows)+
   '<p>Nombre de feuilles Porchet présentes : <strong>'+tests.length+'</strong>. Les valeurs calculées restent provisoires tant que la parité avec le tableur de Fred et la conformité des essais n’ont pas été validées.</p>'));
 for(const t of tests){
   const d=t.data,r=t.result||{};
   chapters.push(chapter("porchet-"+t.key,"2.3 Essai Porchet — "+t.key,
      info([["Diamètre",d.diameter],["Profondeur",d.depth],["Hauteur d’eau",d.height],["Calibration",d.calibration],
        ["K moyen (mm/h)",r.mean===null||r.mean===undefined?"":r.mean],["K graphique (mm/h)",r.graphical===null||r.graphical===undefined?"":r.graphical]])+
      tab(["Relevé","Graduation"],(d.graduations||[]).map((x,i)=>[i+1,x]))+
      '<p>Les durées exactes et les protocoles sont à vérifier avec la feuille de saisie et le fichier Excel de référence de Fred.</p>'+validation));
 }
 chapters.push(chapter("sol","2.4 Aptitude du sol et réserves",
    info([["Observations du sol",value(f,"soil.observations")],["Perméabilité de référence",value(f,"soil.permeability")],["Présence de nappe",value(f,"soil.waterTable")],
     ["Hydromorphie",value(f,"soil.hydromorphy")]])+
    '<p>La proposition de filière doit être précédée d’une analyse croisée des sondages, essais, contraintes et exigences SPANC.</p>'));
 chapters.push(chapter("filiere","3. Choix et justification de la filière",
   info([["Filière envisagée",value(f,"solution.type","design.solution")],["Traitement",value(f,"solution.treatment")],
     ["Évacuation / exutoire",value(f,"solution.outlet")],["Dimensionnement validé",value(f,"design.validated")]])+
   '<p>Aucune filière ne peut être considérée comme approuvée uniquement par génération automatique. Le choix et les cotes sont réservés au professionnel.</p>'));
 chapters.push(chapter("implantation","3.1 Implantation, distances et réseaux",
   info([["Surface exploitable validée",value(f,"parcel.availableArea")],["Position des ouvrages",value(f,"design.position")],
     ["Distances aux bâtiments",value(f,"design.distanceBuilding")],["Distances aux limites",value(f,"design.distanceBoundary")],
     ["Distances aux points d’eau",value(f,"design.distanceWater")],["Réseaux existants",value(f,"terrain.networks")]])+
   '<p>Les distances réglementaires doivent être mesurées sur un plan géoréférencé, puis contrôlées sur le terrain. Les calques de la démo ne constituent pas un plan d’exécution.</p>'));
 chapters.push(chapter("travaux","3.2 Préconisations de chantier",
   info([["Travaux envisagés",value(f,"works.description")],["Gestion des eaux pluviales",value(f,"works.rainwater")],
     ["Accès chantier",value(f,"terrain.access")],["Réserves particulières",value(f,"works.reservations")]])+
   '<p>Contrôler l’altimétrie, les terrassements, les réseaux et les conditions d’implantation avant travaux.</p>'));
 chapters.push(chapter("entretien","4. Utilisation, entretien et maintenance",
   '<p>Un guide d’entretien adapté au dispositif installé, à la notice fabricant et aux consignes de contrôle local doit accompagner la réception du système.</p>'+
   info([["Dispositif retenu",value(f,"solution.type")],["Périodicité de suivi",value(f,"maintenance.schedule")],["Prescriptions particulières",value(f,"maintenance.notes")]])+
   '<p>Ne pas inventer de fréquence de vidange ou de maintenance sans vérifier les prescriptions applicables au matériel effectivement retenu.</p>'));
 chapters.push(chapter("conclusion","5. Conclusion et limites",
   '<p>La présente version compile les données disponibles dans le dossier SpeedArti ANC de démonstration. Les données non saisies ou les services indisponibles sont expressément signalés.</p>'+
   info([["Proposition finale",value(f,"report.conclusion")],["Conformité contrôlée par",value(f,"review.validator")],["Date de validation",value(f,"review.date")]])+
   validation));
 chapters.push(chapter("synthese","6. Fiche de synthèse",
   info([["Étude",titleOf(f,st)],["Client",person],["Commune",value(f,"parcel.city")],
    ["Parcelles",parcels.map(p=>[p.section,p.number].filter(Boolean).join(" ")).join(", ")],
    ["Surface totale (m²)",value(f,"parcel.totalArea")],["Surface disponible ANC (m²)",value(f,"parcel.availableArea")],
    ["Altitude (m)",value(f,"parcel.altitude")],["Nombre sondages",surveys.length],["Nombre essais Porchet",tests.length],
    ["Nombre vues cartographiques",maps.length],["Filière validée",value(f,"solution.type")],
    ["Tranchées du schéma local (m)",st.plan?.points?.length>1?st.plan.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-st.plan.points[i].x,p.y-st.plan.points[i].y),0).toFixed(2)+" m":"" ]])+
   '<h2>Sondages du dossier</h2>'+tab(["Sondage","Profondeur"],surveys.map(s=>[s.name,s.depth?s.depth+" cm":""]))+
   '<h2>Résultats Porchet provisoires</h2>'+tab(["Essai","K moyen (mm/h)"],tests.map(t=>[t.key,t.result?.mean!==null&&t.result?.mean!==undefined&&Number.isFinite(Number(t.result.mean))?Number(t.result.mean).toFixed(3):""]))+
   '<p><b>VALIDATION PROFESSIONNELLE OBLIGATOIRE</b></p>'+
   '<p>Cette synthèse est destinée à la vérification et à la validation du dossier par le bureau d’études.</p>'));
 const mapGroups=[["situation","Annexe 1 — Carte de situation"],
  ["cadastre","Annexe 2 — Plan cadastral et localisation"],
  ["aerial","Annexe 3 — Vue aérienne et terrain"],
  ["implantation","Annexe 4 — Implantation de la filière ANC"],
  ["geology","Annexe 5 — Carte géologique BRGM"]];
 for(const [kind,label] of mapGroups){
   const m=savedMap(kind);
   let img="";
   if(m?.url){
     try{const u=new URL(m.url,location.href);
       if(u.protocol==="https:"&&["data.geopf.fr","geoservices.brgm.fr"].includes(u.hostname))
         img='<img src="'+esc(u.href)+'" style="max-width:100%;max-height:145mm;object-fit:contain" alt="'+esc(label)+'">';
     }catch{}
   }
   chapters.push(chapter("map-"+kind,label,
     '<p><strong>Source :</strong> '+safe(m?.source)+'</p>'+
     (img||'<div style="height:110mm;border:1px dashed #bfcee0;display:grid;place-items:center;color:#6e8496">Carte non enregistrée ou non disponible — à joindre</div>')+
     '<p>Statut : '+safe(m?.status||"À enregistrer")+' — date de sauvegarde : '+safe(m?.savedAt?date(m.savedAt):"")+'</p>'+
     '<p>Les aperçus cartographiques doivent être figés, contrôlés et légendés avant signature. Une URL distante ne remplace pas une image archivée.</p>'));
 }
 const photoCount=Array.isArray(st.cells?.photos)?st.cells.photos.length:0;
 chapters.push(chapter("photos","Annexe 6 — Photographies",
    '<p>Photographies effectivement rattachées au dossier : <strong>'+photoCount+'</strong>.</p>'+
    (photoCount?'<p>Les photos sont à vérifier dans la bibliothèque du dossier ; aucune image fictive n’est ajoutée.</p>':
       '<div style="height:130mm;border:1px dashed #bfcee0;display:grid;place-items:center;color:#6e8496">Aucune photographie enregistrée — annexe à compléter</div>')));
 chapters.push(chapter("sources","Annexe 7 — Sources, références et traçabilité",
    tab(["Donnée","Source","Statut/date"],[
      ["Cadastre",parcels.find(p=>p.status==="AUTO_DETECTED")?.source||"À vérifier",st.userSelectedParcel?.selectedAt?date(st.userSelectedParcel.selectedAt):"Non validé"],
      ["Géocodage",st.geolocation?.source||"Non localisé",st.geolocation?.at?date(st.geolocation.at):""],
      ["Altitude",fmtSource(ter.altitude),ter.altitude?.checkedAt?date(ter.altitude.checkedAt):""],
      ["Météo",fmtSource(src.weather),src.weather?.checkedAt?date(src.weather.checkedAt):""],
      ["Géorisques",fmtSource(src.risks),src.risks?.checkedAt?date(src.risks.checkedAt):""],
      ["BRGM",fmtSource(src.geology),src.geology?.checkedAt?date(src.geology.checkedAt):""]
    ])+
    '<p>Le bureau d’études doit archiver les sources et renouveler les consultations si le site, la date ou la réglementation évoluent.</p>'));
 chapters.push(chapter("signature","Validation professionnelle et signatures",
   info([["Responsable de l’étude",value(f,"review.engineer")],["Organisme",value(f,"company.name")],["Lieu",value(f,"parcel.city")],
     ["Date de validation",value(f,"review.date")],["N° version",value(f,"report.version")]])+
   '<div style="height:38mm;border:1px dashed #ccd5e0;margin-top:10mm;padding:10px">Emplacement signature et cachet — non signé</div>'+
   validation));
 return {chapters,ref,office,person,where};
}
function pageMarkup(ch,i,total,meta){
 const tag=ch.kind==="cover"?"Page de garde":ch.id.startsWith("map-")?"Annexe cartographique":ch.id.startsWith("sondage-")?"Fiche terrain":"Étude ANC";
 return '<section class="a4 anc-generated-page anc-rebuild-page" '+(ch.id==="synthese"?'id="axis-report-page" ':'')+'data-anc-chapter="'+esc(ch.id)+'">'+
   '<div class="page-head"><span>'+esc(meta.office)+'</span><span>'+esc(meta.ref)+'</span><span>'+String(i+1)+' / '+total+'</span></div>'+
   '<div class="anc-page-body"><div class="anc-report-chapter-tag">'+tag+'</div>'+
   '<h1>'+esc(ch.title)+'</h1>'+ch.content+'</div>'+
   '<div class="page-foot"><span>SpeedArti ANC — SPÉCIMEN non validé</span><span>Réf. '+esc(meta.ref)+' — '+String(i+1)+' / '+total+'</span></div></section>';
}
function generate(section){
 const st=get(),node=$("#report-pages",section);if(!st||!node)return;
 const meta=build(st),chapters=meta.chapters;
 const toc=chapters.map((ch,i)=>'<div style="display:flex;gap:12px;border-bottom:1px dotted #d7e0e9;padding:5px 0;font-size:10pt">'+
    '<span style="flex:1">'+esc(ch.title)+'</span><strong>'+String(i+1)+'</strong></div>').join("");
 chapters[1].content='<p>Sommaire généré à partir des pages effectivement présentes dans le dossier.</p>'+toc;
 node.innerHTML=chapters.map((ch,i)=>pageMarkup(ch,i,chapters.length,meta)).join("");
 const summary=$("#anc-report-page-counter",section);
 if(summary)summary.textContent=chapters.length+" pages A4 — rapport du dossier « "+titleOf(st.fields||{},st)+" » — éléments manquants signalés";
 node.dataset.reportMode="dossier";
 section.dataset.reportMode="dossier";
}
function showHistory(section){
 const node=$("#report-pages",section),html=window.ANCHistoricalReportTemplate;
 if(!html||!node)return;
 node.innerHTML=html;
 node.querySelectorAll(":scope > section.a4").forEach(p=>{
   const watermark=document.createElement("p");watermark.className="anc-report-model-watermark";
   watermark.textContent="MODÈLE HISTORIQUE • DONNÉES FICTIVES • NON SIGNABLE";
   p.prepend(watermark);p.hidden=false;
 });
 node.dataset.reportMode="historique";section.dataset.reportMode="historique";
 const counter=$("#anc-report-page-counter",section);
 if(counter)counter.textContent=node.querySelectorAll(":scope > section.a4").length+" pages A4 — ancien modèle visuel, données fictives (comparaison uniquement)";
}
function mount(section){
 if(section?.id!=="rapport")return;
 let toolbar=$("#anc-report-restore-toolbar",section);
 if(!toolbar){
   toolbar=document.createElement("div");toolbar.id="anc-report-restore-toolbar";
   toolbar.className="anc-report-toolbar";
   toolbar.innerHTML='<button type="button" class="btn primary" data-anc-report-view="dossier" aria-pressed="true">Rapport complet du dossier</button>'+
     '<button type="button" class="btn secondary" data-anc-report-view="historique" aria-pressed="false">Voir l’ancien modèle (29 pages)</button>'+
     '<button type="button" class="btn secondary" data-anc-report-refresh="1">Actualiser depuis le dossier</button>'+
     '<span class="anc-report-summary" id="anc-report-page-counter"></span>';
   section.querySelector(".section-head")?.insertAdjacentElement("afterend",toolbar);
 }
 const exportWord=section.querySelector('[data-action="export-word"]');
 if(exportWord)exportWord.textContent="Exporter Word compatible (.doc)";
 generate(section);
}
function exportWord(section){
 if(section?.dataset.reportMode!=="dossier")generate(section);
 const pages=$("#report-pages",section);if(!pages)return;
 const st=get(),ref=String(st?.fields?.reference||st?.id||"anc");
 const html='<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>'+
   'body{font-family:Arial,sans-serif;color:#263b51}section{page-break-after:always;padding:20px}h1{color:#144f85;font-size:21px}h2{color:#225d95}'+
   'table{border-collapse:collapse;width:100%}th,td{border:1px solid #becddc;text-align:left;padding:6px;font-size:11px}'+
   '.page-head,.page-foot{font-size:9px;color:#5f6c7a}.anc-report-notice{border:1px solid #c9a354;padding:12px}'+
   '</style></head><body>'+pages.innerHTML+'</body></html>';
 const blob=new Blob(["\ufeff",html],{type:"application/msword;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="ANC_"+ref.replace(/[^a-z0-9_-]/gi,"_")+".doc";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function handle(event){
 const button=event.target.closest("button");
 if(!button||!button.closest("#rapport"))return false;
 const section=$("#rapport");
 if(button.dataset.ancReportView){
   const mode=button.dataset.ancReportView;
   if(mode==="historique")showHistory(section);else generate(section);
   section.querySelectorAll("[data-anc-report-view]").forEach(b=>{
     const on=b.dataset.ancReportView===mode;b.setAttribute("aria-pressed",String(on));
     b.classList.toggle("primary",on);b.classList.toggle("secondary",!on);
   });
   return true;
 }
 if(button.dataset.ancReportRefresh!==undefined){generate(section);return true;}
 if(button.dataset.action==="export-word"){exportWord(section);return true;}
 if(button.dataset.action==="print"){
   // L'impression suit le mode explicitement sélectionné ; ancien modèle = FILIGRANE SPÉCIMEN.
   window.print();return true;
 }
 return false;
}
window.ANCReportRestoration={mount,handle,generate,showHistory};
})();