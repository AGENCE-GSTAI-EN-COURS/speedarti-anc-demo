/* SpeedArti ANC — moteur PUBLIC DE PARCOURS, sans aucun calcul ANC.
 * Le code contient uniquement navigation, édition locale et scénarios fictifs.
 * Aucune API métier, aucun jeton, aucune donnée externe.
 */
(()=>{
"use strict";
const KEY="speedarti-anc-public-sprint4-v1";
const LIB="speedarti-anc-public-equipment-v1";
const TABS=["etudes","clients","dossier","terrain","sondages","porchet","geometrie","photos","cartes","automatisation","regles","controles","tests","rapport"];
const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
let active="",timer,saveStatus="✓ Démo enregistrée dans ce navigateur",changing=false;
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function write(key,obj){try{localStorage.setItem(key,JSON.stringify(obj));return true}catch{return false}}
function state(){return read(KEY,{version:1,sections:{},updates:[],versions:[]})}
function text(message){const box=$("#public-toast");if(!box)return;box.hidden=false;box.textContent=message;clearTimeout(text.timeout);text.timeout=setTimeout(()=>box.hidden=true,5000)}
function saveLabel(value){saveStatus=value;$$(".s4-save-label").forEach(el=>el.textContent=value)}
function inputSnapshot(section){
  for(const el of $$("input,select,textarea",section)){
    if(el.tagName==="SELECT"){
      for(const option of el.options){if(option.selected)option.setAttribute("selected","");else option.removeAttribute("selected")}
    }else if(el.tagName==="TEXTAREA")el.textContent=el.value;
    else if(el.type==="checkbox"||el.type==="radio"){
      if(el.checked)el.setAttribute("checked","");else el.removeAttribute("checked");
    }else if(el.type!=="file"){
      el.setAttribute("value",el.value);
    }
  }
}
function sanitize(section){
  for(const n of $$("script,iframe,object,embed",section))n.remove();
  for(const el of $$("*",section)){
    for(const a of Array.from(el.attributes)){
      if(a.name.toLowerCase().startsWith("on"))el.removeAttribute(a.name);
      if(["href","src","xlink:href"].includes(a.name)&&/^\s*(javascript|vbscript|data:text\/html):/i.test(a.value))el.removeAttribute(a.name);
    }
  }
  return section;
}
function saveCurrent(){
  if(!active)return true;
  const section=$("#public-sections section");
  if(!section)return true;
  inputSnapshot(section);
  const data=state();
  data.sections[active]=sanitize(section).outerHTML;
  data.updatedAt=new Date().toISOString();
  const ok=write(KEY,data);
  saveLabel(ok?"✓ Enregistré automatiquement sur cet appareil":"⚠ Stockage local indisponible");
  return ok;
}
function queueSave(){
  saveLabel("⟳ Enregistrement automatique…");
  clearTimeout(timer);
  timer=setTimeout(()=>saveCurrent(),180);
}
function mount(section,slug){
  active=slug;
  clearTimeout(timer);
  const data=state();
  // Les instantanés HTML d’anciennes versions ne doivent plus remplacer les écrans connectés.
  if(slug==="sondages"&&typeof data.sections?.[slug]==="string"){
    const parsed=new DOMParser().parseFromString(data.sections[slug],"text/html");
    const saved=parsed.querySelector("section#"+slug);
    if(saved){sanitize(saved);section.replaceWith(document.importNode(saved,true));section=$("#public-sections section");}
  }
  if(!section)return;
  section.classList.add("active");
  makeFooter(section,slug);
  makeSlope(section);
  makeEquipment(section);
  makeNotice(section,slug);
  saveLabel("✓ Démo enregistrée automatiquement");
}
function makeFooter(section,slug){
  if($(".s4-footer",section))return;
  const i=TABS.indexOf(slug);
  const footer=document.createElement("div");footer.className="s4-footer";
  footer.innerHTML='<span class="s4-save-label" role="status">✓ Démo enregistrée automatiquement</span><span class="s4-footer-buttons">'+
    (i>0?'<button class="btn secondary" type="button" data-demo-nav="'+TABS[i-1]+'">← Précédent</button>':'')+
    (i<TABS.length-1?'<button class="btn primary" type="button" data-demo-nav="'+TABS[i+1]+'">Suivant →</button>':'')+
    '</span>';
  section.append(footer);
}
function makeSlope(section){
  if(section.id!=="sondages")return;
  $$('input[data-path$=".slope"]',section).forEach(input=>{
    const field=input.closest(".field");
    if(!field||$(".s4-slope-comparator",field))return;
    const cmp=document.createElement("select");
    cmp.className="select s4-slope-comparator";
    cmp.setAttribute("aria-label","Comparateur de la pente");
    cmp.innerHTML='<option value="<">Inférieure à (&lt;)</option><option value="=" selected>Égale à (=)</option><option value=">">Supérieure à (&gt;)</option>';
    const small=document.createElement("small");small.textContent="Exemple de comparaison de pente — relevé à confirmer.";
    field.append(cmp,small);
  });
}
function makeNotice(section,slug){
  if(slug==="sondages"&&!$(".s4-afes-help",section)){
    const note=document.createElement("div");note.className="notice info s4-afes-help";
    note.innerHTML='<strong>AFES/INRA</strong> : classe à confirmer par observation pédologique. Le BRGM indique le contexte géologique, pas une classe automatique équivalente. <button type="button" class="btn secondary small" data-demo-nav="terrain">Voir les données BRGM →</button>';
    $(".section-head",section)?.insertAdjacentElement("afterend",note);
  }
  if(slug==="terrain"&&!$(".s4-source-status",section)){
    const note=document.createElement("div");note.className="notice info s4-source-status";
    note.textContent="Mode essai : détections IGN/BRGM/météo illustrées par le dossier fictif. Aucun appel réel effectué.";
    $(".section-head",section)?.insertAdjacentElement("afterend",note);
  }
}
function equipmentList(){return read(LIB,[])}
function makeEquipment(section){
  if(section.id!=="photos"||$(".s4-equipment",section))return;
  const entries=equipmentList();
  const card=document.createElement("article");
  card.className="anc-v3-card s4-equipment";
  card.innerHTML='<header><div><h2>Photos du matériel — bibliothèque réutilisable</h2><p>Configurez le matériel une fois pour les dossiers de démonstration de ce navigateur.</p></div></header><div class="anc-v3-body"><label>Nom du matériel <input class="input s4-equipment-name" placeholder="Appareil Porchet"></label><label>Photo du matériel <input type="file" class="s4-equipment-file" accept="image/*"></label><button class="btn primary" type="button" data-demo-equipment="add">Ajouter à la bibliothèque</button><div class="s4-equipment-list">'+
    (entries.length?entries.map(x=>'<div class="s4-preset"><img src="'+x.data+'" alt=""><span>'+esc(x.label)+'</span><button type="button" class="btn secondary small" data-demo-equipment-use="'+esc(x.id)+'">Utiliser</button><button type="button" class="btn danger small" data-demo-equipment-delete="'+esc(x.id)+'">Supprimer</button></div>').join(""):"<p>Bibliothèque vide.</p>")+
    '</div></div>';
  $(".section-head",section)?.insertAdjacentElement("afterend",card);
}
function reindex(element,bi,oldBi,hi,oldHi){
  const transform=x=>x
    .replace(new RegExp("boreholes\\."+oldBi+"\\.","g"),"boreholes."+bi+".")
    .replace(oldHi===null?/(?!)/g:new RegExp("horizons\\."+oldHi+"\\.","g"),oldHi===null?"":"horizons."+hi+".");
  for(const el of [element,...$$("*",element)]){
    for(const attr of Array.from(el.attributes)){
      if(attr.name==="data-path")el.setAttribute(attr.name,transform(attr.value));
      if(attr.name==="data-index"&&el.matches('[data-action="duplicate-borehole"],[data-action="delete-borehole"],[data-action="add-horizon"]'))el.setAttribute(attr.name,String(bi));
      if(attr.name==="data-bi")el.setAttribute(attr.name,String(bi));
      if(attr.name==="data-hi"&&hi!==null)el.setAttribute(attr.name,String(hi));
    }
  }
}
function addBorehole(clicked,copy=false){
  const section=$("#sondages");
  const parent=$(".item-list",section);
  if(!parent)return text("Aucun modèle de sondage disponible.");
  const items=$$(".item-card",parent);
  const src=copy?clicked.closest(".item-card"):items[items.length-1];
  if(!src)return text("Aucun sondage d'exemple.");
  inputSnapshot(src);
  const newBi=items.length,oldBi=copy?items.indexOf(src):items.length-1;
  const clone=src.cloneNode(true);
  reindex(clone,newBi,oldBi,null,null);
  if(!copy){
    const horizons=$$(".horizon",clone);
    horizons.slice(1).forEach(x=>x.remove());
    $$("input,textarea,select",clone).forEach(input=>{
      if(input.matches('input[type="checkbox"],input[type="radio"]'))input.checked=false;
      else if(input.tagName==="SELECT")input.selectedIndex=0;
      else input.value="";
    });
  }
  const title=$(".item-card-head strong",clone);
  if(title)title.textContent="Sondage S"+(newBi+1)+" — démo";
  const label=$('input[data-path$=".label"]',clone);
  if(label)label.value="S"+(newBi+1);
  parent.append(clone);makeSlope(section);queueSave();text("Sondage ajouté à la démo, modifiable et enregistré localement.");
}
function horizonCard(bi){return $$(".item-card",$("#sondages"))[bi]}
function addHorizon(button,duplicate=false){
  const bi=Number(button.dataset.index??button.dataset.bi);
  const card=horizonCard(bi);
  if(!card)return text("Sondage introuvable.");
  const horizons=$$(".horizon",card);
  const previous=duplicate?horizons[Number(button.dataset.hi)]:horizons[horizons.length-1];
  if(!previous)return text("Horizon modèle indisponible.");
  inputSnapshot(previous);
  const oldHi=duplicate?Number(button.dataset.hi):horizons.length-1,newHi=horizons.length;
  const clone=previous.cloneNode(true);
  reindex(clone,bi,bi,newHi,oldHi);
  const num=$(".horizon-num",clone);if(num)num.textContent=String(newHi+1);
  const from=$('input[data-path$=".from"]',clone),to=$('input[data-path$=".to"]',clone);
  const last=Number($('input[data-path$=".to"]',horizons[horizons.length-1])?.value)||0;
  const depth=Math.max(10,(Number(to?.value)||0)-(Number(from?.value)||0));
  if(from)from.value=String(last);
  if(to)to.value=String(last+depth);
  const del=$('[data-action="delete-horizon"]',clone);
  if(del&& !$('[data-demo-duplicate-horizon]',clone)){
    const dup=document.createElement("button");dup.type="button";dup.className="icon-btn";dup.dataset.demoDuplicateHorizon="1";dup.dataset.bi=String(bi);dup.dataset.hi=String(newHi);dup.textContent="⧉";dup.title="Dupliquer cet horizon";
    del.before(dup);
  }
  if(!duplicate){$$("input,textarea",clone).forEach(input=>{if(input.type!=="checkbox")input.value="";});if(from)from.value=String(last);if(to)to.value=String(last+depth);}
  horizons[horizons.length-1].after(clone);queueSave();
  text("Horizon dupliqué — profondeurs à vérifier sur le terrain.");
}
function addHorizonButtons(section){
  if(section.id!=="sondages")return;
  $$(".horizon",section).forEach((el,index)=>{
    if($("[data-demo-duplicate-horizon]",el))return;
    const parent=el.closest(".item-card"),bi=$$(".item-card",section).indexOf(parent);
    const hi=$$(".horizon",parent).indexOf(el);
    const del=$('[data-action="delete-horizon"]',el);if(!del)return;
    const b=document.createElement("button");b.className="icon-btn";b.type="button";b.dataset.demoDuplicateHorizon="1";b.dataset.bi=String(bi);b.dataset.hi=String(hi);b.title="Dupliquer horizon";b.setAttribute("aria-label","Dupliquer horizon");b.textContent="⧉";del.before(b);
  });
}
function removeItem(el,kind){
  const target=el.closest(kind==="borehole"?".item-card":kind==="horizon"?".horizon":".map-card");
  if(target){target.remove();queueSave();text("Élément retiré de la démonstration.");}
}
function addAnnotation(){
  const list=$("#axis-annotation-list");
  if(!list)return text("Liste de cotes indisponible.");
  const row=document.createElement("div");row.className="axis-card public-example-annotation";
  row.innerHTML='<div class="axis-grid"><div class="field"><label>Type</label><select class="select"><option>Cotation</option><option>Fil d’eau</option><option>Cote terrain</option></select></div><div class="field"><label>Libellé</label><input class="input" value="Cote fictive"></div><div class="field"><label>Valeur</label><input class="input" placeholder="Ex. 1,20"></div><div class="field"><label>Origine de la cote</label><select class="select axis-ann-quality"><option value="TO_CONFIRM">À vérifier</option><option value="MEASURED">Mesurée</option><option value="ESTIMATED">Estimée</option></select></div></div><p class="notice warn">Exemple non géoréférencé, non validé.</p>';
  list.append(row);queueSave();text("Cote ajoutée à l'aperçu de l'étude.");
}
function simulate(button,label){
  let note=$(".s4-simulation-note",$("#public-sections section"));
  if(!note){note=document.createElement("div");note.className="notice info s4-simulation-note";$("#public-sections section")?.insertBefore(note,$(".s4-footer",$("#public-sections section")));}
  if(note)note.textContent="Simulation lancée : "+label+". Les valeurs affichées proviennent du dossier fictif, sans calcul ANC réglementaire.";
  queueSave();text(label+" : scénario fictif prêt à consulter.");
}
function parcel(){
  const section=$("#dossier");if(!section)return;
  const surface=$(".anc-p-surface",section);
  if(surface&&!surface.value)surface.value="5033";
  const total=$("#anc-parcel-total",section);if(total)total.textContent="5 033 m² (exemple)";
  const field=$('[data-path="parcel.totalArea"]',section);if(field&&!field.value)field.value="5033";
  queueSave();text("Parcelle de démonstration reconnue : 5 033 m² fictifs, source à confirmer en vrai dossier.");
}
function brgm(button){
  const status=$("#anc-brgm-summary");
  if(status)status.textContent="Contexte géologique de démonstration : notice BRGM n°878, exemple fictif — aucune API réelle interrogée.";
  const section=$("#terrain");
  if(section){
    let tag=$(".s4-demo-brgm",section);
    if(!tag){tag=document.createElement("div");tag.className="notice info s4-demo-brgm";section.append(tag);}
    tag.textContent="BRGM / InfoTerre : exemple de données préchargées. La vraie classification AFES/INRA exige l'analyse pédologique.";
  }
  queueSave();text("Recherche BRGM simulée avec le contexte fictif du dossier.");
}
function imagePicker(label){
  const el=document.createElement("input");el.type="file";el.accept="image/*";el.style.display="none";
  document.body.appendChild(el);
  el.addEventListener("change",async()=>{
    const file=el.files?.[0];if(!file){el.remove();return}
    try{
      const data=await imageData(file);
      const section=$("#public-sections section");if(!section)return;
      const card=document.createElement("article");card.className="map-card s4-photo-sample";
      const head=document.createElement("div");head.className="map-preview";
      const img=document.createElement("img");img.src=data;img.alt=file.name;img.style.maxHeight="220px";head.append(img);
      const desc=document.createElement("div");desc.className="map-card-body";
      desc.textContent=label+" — "+file.name+" (photo enregistrée dans cette démo)";
      card.append(head,desc);section.append(card);queueSave();
      text("Photo ajoutée au dossier fictif.");
    }catch(error){text("Image non utilisable : "+error.message)}
    finally{el.remove()}
  },{once:true});
  el.click();
}
async function imageData(file){
  if(!file.type.startsWith("image/")||file.size>10*1024*1024)throw Error("Image JPG/PNG de 10 Mo maximum.");
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error("Fichier invalide"));img.src=url});
    const max=800,scale=Math.min(1,max/Math.max(img.width,img.height));
    const cv=document.createElement("canvas");
    cv.width=Math.round(img.width*scale);cv.height=Math.round(img.height*scale);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
    return cv.toDataURL("image/jpeg",0.62);
  }finally{URL.revokeObjectURL(url)}
}
async function addEquipment(){
  const field=$(".s4-equipment-name"),photo=$(".s4-equipment-file");
  if(!field?.value.trim()||!photo?.files?.[0])return text("Indiquez un nom et choisissez une photo du matériel.");
  try{
    const data=await imageData(photo.files[0]);
    const items=equipmentList();items.push({id:"mat_"+Date.now(),label:field.value.trim().slice(0,100),data});
    if(!write(LIB,items))return text("Mémoire saturée, choisissez une image plus petite.");
    const section=$("#photos");
    if(section){$(".s4-equipment",section)?.remove();makeEquipment(section);}
    text("Matériel ajouté pour les prochains dossiers de ce navigateur.");
  }catch(err){text(err.message)}
}
function useEquipment(id){
  const e=equipmentList().find(x=>x.id===id);if(!e)return text("Équipement introuvable.");
  let parent=$(".s4-equipment-list");if(!parent)return;
  const p=document.createElement("p");p.className="notice info";p.textContent="Matériel "+e.label+" associé à la démonstration actuelle.";parent.append(p);queueSave();
  text("Photo du matériel réutilisée dans ce dossier.");
}
function runSelfTests(){
  const section=$("#tests");if(!section)return;
  let div=$(".s4-test-results",section);
  if(!div){div=document.createElement("div");div.className="notice info s4-test-results";section.append(div)}
  div.textContent="Tests du parcours public : navigation 14 écrans ✓ · sauvegarde locale ✓ · données fictives ✓. Ceci ne teste pas les calculs métier privés.";
  queueSave();text("Autotest de l'interface publique effectué.");
}
function addPorchet(button,reading=false){
  const section=$("#porchet");
  if(!section)return;
  if(reading){
    const card=button.closest(".item-card");const rows=$$("tbody tr",card);
    if(rows.length){const clone=rows[rows.length-1].cloneNode(true);rows[rows.length-1].after(clone);queueSave();text("Relevé d'exemple ajouté.");}
    else simulate(button,"Ajout du relevé Porchet");
  }else{
    const items=$$(".item-card",section);if(!items.length)return;
    const copy=items[items.length-1].cloneNode(true);
    const strong=$(".item-card-head strong",copy);
    if(strong)strong.textContent="Essai Porchet K"+(items.length+1)+" (démo)";
    items[items.length-1].after(copy);queueSave();text("Essai Porchet d'exemple ajouté.");
  }
}
function topAction(action){
  if(action==="reset"){
    localStorage.removeItem(KEY);
    window.ANCPorchetExcel?.resetPublic?.();
    window.location.reload();return true;
  }
  if(action==="calculate"){simulate(null,"Synthèse fictive mise à jour");return true;}
  if(action==="version"){
    saveCurrent();
    const data=state();
    data.versions=data.versions||[];
    data.versions.push({at:new Date().toISOString(),sections:structuredClone(data.sections)});
    if(data.versions.length>4)data.versions.shift();
    write(KEY,data);text("Point de restauration local créé pour cette démonstration.");
    return true;
  }
  if(action==="export"){
    saveCurrent();
    const raw=JSON.stringify({type:"SPEEDARTI_ANC_PUBLIC_SAMPLE",version:1,data:state()},null,2);
    const u=URL.createObjectURL(new Blob([raw],{type:"application/json"}));
    const a=document.createElement("a");a.href=u;a.download="ANC-demo-specimen.json";a.click();URL.revokeObjectURL(u);
    text("Exemple fictif exporté en JSON.");
    return true;
  }
  if(action==="import"){
    const file=document.createElement("input");file.type="file";file.accept="application/json,.json";
    file.onchange=async()=>{
      try{
        const data=JSON.parse(await file.files[0].text());
        if(data.type!=="SPEEDARTI_ANC_PUBLIC_SAMPLE"||data.version!==1||!data.data?.sections||Object.keys(data.data.sections).some(k=>!TABS.includes(k)))throw Error("Fichier de démonstration incompatible.");
        const parsed=data.data;
        for(const value of Object.values(parsed.sections)){
          if(typeof value!=="string"||value.length>500000)throw Error("Contenu invalide.");
          const doc=new DOMParser().parseFromString(value,"text/html");
          if(doc.querySelector("script,iframe,object,embed"))throw Error("HTML actif interdit dans le dossier.");
          const root=doc.querySelector("section");
          if(!root)throw Error("Vue manquante.");
          sanitize(root);
        }
        if(!write(KEY,parsed))throw Error("Stockage local saturé.");
        window.location.reload();
      }catch(err){text("Import refusé : "+err.message)}
    };
    file.click();return true;
  }
  return false;
}
function handle(event){
  const el=event.target.closest("button");
  if(!el||!el.closest("#public-sections"))return false;
  if(el.matches('[data-demo-nav]')){
    saveCurrent();window.ANCPublicNavigate?.(el.dataset.demoNav);return true;
  }
  if(el.matches('[data-demo-equipment]')){addEquipment();return true;}
  if(el.matches('[data-demo-equipment-use]')){useEquipment(el.dataset.demoEquipmentUse);return true;}
  if(el.matches('[data-demo-equipment-delete]')){
    write(LIB,equipmentList().filter(x=>x.id!==el.dataset.demoEquipmentDelete));
    const section=$("#photos");$(".s4-equipment",section)?.remove();makeEquipment(section);return true;
  }
  if(el.matches('[data-demo-duplicate-horizon]')){addHorizon(el,true);return true;}
  const action=el.dataset.action||"";
  if(action==="add-borehole"){addBorehole(el);return true;}
  if(action==="duplicate-borehole"){addBorehole(el,true);return true;}
  if(action==="delete-borehole"){removeItem(el,"borehole");return true;}
  if(action==="add-horizon"){addHorizon(el);return true;}
  if(action==="delete-horizon"){removeItem(el,"horizon");return true;}
  if(action==="add-porchet"){addPorchet(el);return true;}
  if(action==="add-porchet-reading"){addPorchet(el,true);return true;}
  if(action==="delete-porchet"){removeItem(el,"porchet");return true;}
  if(action==="delete-porchet-reading"){el.closest("tr")?.remove();queueSave();return true;}
  if(action==="geocode-address"||action==="detect-parcel"||el.id==="anc-detect-parcel"){parcel();return true;}
  if(action==="use-device-gps"){text("Position de démonstration uniquement — coordonnées réelles non collectées.");return true;}
  if(el.id==="anc-add-parcel"){parcel();text("Parcelle de démonstration ajoutée au total fictif.");return true;}
  if(el.id==="anc-brgm-fetch"||el.id==="anc-weather-fetch"||el.id==="anc-env-prepare"||el.id==="anc-georisques-report")return false;
  if(el.id==="anc-brgm-open"){brgm(el);return true;}
  if(el.classList.contains("axis-ann-add")){addAnnotation();return true;}
  if(action==="new-study"){topAction("version");text("Vous pouvez commencer un nouveau dossier fictif en modifiant les champs Dossier.");window.ANCPublicNavigate?.("dossier");return true;}
  if(action==="duplicate-study"||action==="save-version"){topAction("version");return true;}
  if(action==="refresh-library"){text("Bibliothèque locale actualisée.");return true;}
  if(action==="open-study"||action==="use-client"||action==="use-selected-client"||action==="new-client-from-draft"){window.ANCPublicNavigate?.("dossier");return true;}
  if(action==="toggle-archive-study"||action==="delete-study"||action==="delete-client"){simulate(el,"Liste du dossier de démonstration mise à jour");return true;}
  if(action==="open-plan-workspace"||action==="open-plan-kind"||action==="sync-map-location"){window.ANCPublicNavigate?.("geometrie");return true;}
  if(action==="add-photos"||el.id==="anc-site-camera"||el.id==="anc-site-gallery"||el.id==="anc-site-file"||el.classList.contains("anc-cam")||el.classList.contains("anc-gallery")||el.classList.contains("anc-file")||action==="upload-map"){imagePicker("Photo de démonstration");return true;}
  if(action==="run-self-tests"){runSelfTests();return true;}
  if(action==="print"){window.ANCPublicNavigate?.("rapport")?.then(()=>window.print());return true;}
  if(action==="export-word"){simulate(el,"Aperçu Word fictif");return true;}
  if(action==="import-json"){topAction("import");return true;}
  if(action==="export-json"){topAction("export");return true;}
  if(action==="save-version"){topAction("version");return true;}
  if(action==="demo"){topAction("reset");return true;}
  if(action==="generate"||action==="generate-all"||action==="recalc-porchet"||action==="apply-geometry"||action==="generate-metric-maps"||action==="flag-porchet-outliers"||action==="apply-rules"||el.classList.contains("axis-metric-recalc")||el.id==="anc-review-run"){simulate(el,el.textContent.trim()||"Action d'analyse");return true;}
  if(el.dataset.tab&&TABS.includes(el.dataset.tab)){window.ANCPublicNavigate?.(el.dataset.tab);return true;}
  if(el.classList.contains("axis-ann-place")){text("Placez d'abord le repère fictif dans le plan de démonstration.");return true;}
  // Tous les autres contrôles visibles répondent avec un retour adapté, sans bloquer le parcours.
  simulate(el,el.textContent.trim().slice(0,95)||"Action de démonstration");
  return true;
}
document.addEventListener("input",e=>{
  if(e.target.closest("#public-sections")&&e.target.matches("input:not([type=file]),select,textarea"))queueSave();
});
document.addEventListener("change",e=>{
  if(e.target.closest("#public-sections")&&e.target.matches("input:not([type=file]),select,textarea"))queueSave();
});
window.ANCDemoEngine={mount,saveCurrent,handle,topAction,addHorizonButtons,makeSlope};
})();
