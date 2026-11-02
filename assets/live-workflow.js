/* ANC V3 — démonstration interactive locale.
 * État partagé entre Dossier, Chantier, Sondages, Porchet et Rapport.
 * Aucune donnée cliente réelle, aucun serveur, aucun moteur privé publié.
 */
(() => {
  "use strict";
  const KEY="speedarti-anc-real-workflow-v1";
  const PORCHET_KEY="speedarti-anc-public-porchet-excel-v1";
  const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
  const $=(s,root=document)=>root.querySelector(s);
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const id=()=>("ANC-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7));
  const fresh=(title="Nouvelle étude de démonstration")=>({id:id(),name:title,createdAt:new Date().toISOString(),fields:{},cells:{},toggles:{},porchet:null,archived:false,isNew:true});
  function initial(){const example=fresh("Étude ANC — exemple");example.isNew=false;return {version:1,activeId:example.id,studies:[example],clients:[],updatedAt:new Date().toISOString()};}
  function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||"null");return data?.version===1&&Array.isArray(data.studies)?data:initial();}catch{return initial()}}
  function save(db){db.updatedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch{notice("Enregistrement impossible : espace de stockage insuffisant.");return false}}
  function current(db){return db.studies.find(x=>x.id===db.activeId)||db.studies[0]}
  function notice(message){
    const el=$("#public-toast");if(!el)return;
    el.textContent=message;el.hidden=false;
    clearTimeout(notice.timeout);
    notice.timeout=setTimeout(()=>el.hidden=true,5000);
  }
  function status(yes){
    $$(".s4-save-label").forEach(el=>el.textContent=yes?"✓ Enregistré automatiquement dans le dossier":"⚠ Échec de l’enregistrement");
  }
  function storePorchet(db){
    const study=current(db);if(!study)return;
    try{study.porchet=localStorage.getItem(PORCHET_KEY)||null}catch{}
  }
  function loadPorchet(study){
    try{
      if(study?.porchet)localStorage.setItem(PORCHET_KEY,study.porchet);
      else localStorage.removeItem(PORCHET_KEY);
    }catch{}
  }
  function getValue(el){
    if(el.tagName==="SELECT"&&el.multiple)return Array.from(el.selectedOptions).map(o=>o.value);
    if(el.type==="checkbox")return el.checked;
    if(el.type==="radio")return el.checked?el.value:null;
    return el.value;
  }
  function putValue(el,value){
    if(Array.isArray(value)&&el.tagName==="SELECT"){
      for(const opt of el.options)opt.selected=value.includes(opt.value);
    }else if(el.type==="checkbox")el.checked=!!value;
    else if(el.type!=="file")el.value=String(value??"");
  }
  function commitElement(el){
    const path=el.dataset.path;
    if(!path)return;
    const db=read(),study=current(db);
    if(!study)return;
    const value=getValue(el);
    if(value===null)return;
    study.fields[path]=value;
    if(path==="title")study.name=String(value||study.name);
    if(path==="owner.firstName"||path==="owner.lastName")study.fields[path]=value;
    const ok=save(db);status(ok);
    if(path==="parcel.totalArea"||el.classList.contains("anc-p-surface"))updateParcelTotal();
  }
  function bindFields(section){
    const db=read(),study=current(db);if(!study)return;
    for(const el of $$("[data-path]",section)){
      const path=el.dataset.path;
      if(Object.prototype.hasOwnProperty.call(study.fields,path))putValue(el,study.fields[path]);
    }
  }
  function captureFieldState(root){
    const db=read(),study=current(db);if(!study)return false;
    for(const el of $$("[data-path]",root)){
      if(el.matches('input[type="file"]'))continue;
      const value=getValue(el);
      if(value!==null)study.fields[el.dataset.path]=value;
    }
    return save(db);
  }
  function updateParcelTotal(){
    const section=$("#dossier");if(!section)return;
    const inputs=$$(".anc-p-surface",section);
    const amounts=inputs.map(el=>Number(String(el.value||"").replace(",","."))).filter(x=>Number.isFinite(x)&&x>=0);
    if(!amounts.length)return;
    const total=amounts.reduce((a,b)=>a+b,0);
    const target=$("#anc-parcel-total",section);
    if(target)target.textContent=new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2}).format(total)+" m²";
    const field=$('[data-path="parcel.totalArea"]',section);
    if(field)field.value=String(total);
    const db=read(),study=current(db);
    if(study){study.fields["parcel.totalArea"]=String(total);save(db)}
  }
  function storeCellSnapshot(section){
    const db=read(),study=current(db);
    if(!study)return;
    if(section?.id==="sondages"){
      study.cells.sondages=$$(".item-card",section).map(card=>{
        const fields={};for(const el of $$("[data-path]",card))fields[el.dataset.path]=getValue(el);
        const slopes=$$(".s4-slope-comparator",card).map(x=>x.value);
        const multiselects=$$("select[multiple]",card).map(x=>({path:x.dataset.path||"",values:getValue(x)}));
        return {fields,slopes,multiselects,html:card.outerHTML};
      });
    }
    storePorchet(db);save(db);
  }
  function restoreBoreholes(section){
    const study=current(read());
    const cards=study?.cells?.sondages;
    if(!Array.isArray(cards)||!cards.length)return;
    const list=$(".item-list",section);if(!list)return;
    const parser=new DOMParser();
    const tmp=document.createDocumentFragment();
    for(const item of cards){
      const doc=parser.parseFromString(item.html,"text/html");
      const node=doc.querySelector(".item-card");if(!node)continue;
      node.querySelectorAll("script,iframe,object,embed").forEach(x=>x.remove());
      for(const el of node.querySelectorAll("*")){
        for(const att of Array.from(el.attributes)){
          if(att.name.toLowerCase().startsWith("on")||["href","src"].includes(att.name)&&/^(javascript|data:text\/html)/i.test(att.value))
            el.removeAttribute(att.name);
        }
      }
      for(const el of $$("[data-path]",node)){
        if(Object.prototype.hasOwnProperty.call(item.fields,el.dataset.path))putValue(el,item.fields[el.dataset.path]);
      }
      $$(".s4-slope-comparator",node).forEach((el,i)=>{if(item.slopes[i])el.value=item.slopes[i]});
      tmp.appendChild(node);
    }
    if(tmp.childNodes.length)list.replaceChildren(tmp);
  }
  function onMultiSelect(el){
    const fieldset=el.closest(".axis-touch-soils");if(!fieldset)return;
    const field=fieldset.closest(".field");
    const select=field?.querySelector("select[multiple]");
    if(!select)return;
    const values=$$('input[type=checkbox]',fieldset).filter(x=>x.checked).map(x=>x.value);
    for(const opt of select.options)opt.selected=values.includes(opt.value);
    commitElement(select);
  }
  function syncMultiselects(section){
    for(const select of $$("select[multiple][data-path]",section)){
      const checked=select.selectedOptions;
      const fieldset=select.closest(".field")?.querySelector(".axis-touch-soils");
      if(!fieldset)continue;
      const values=Array.from(checked).map(x=>x.value);
      for(const el of $$('input[type="checkbox"]',fieldset))el.checked=values.includes(el.value);
    }
  }
  function studiesPanel(section){
    $("#live-studies",section)?.remove();
    const db=read(),selected=current(db);
    const article=document.createElement("article");article.className="card";article.id="live-studies";
    article.innerHTML='<header class="card-head"><div><h2>Mes études de démonstration</h2><p>Chaque dossier conserve séparément ses formulaires et ses essais Porchet dans ce navigateur.</p></div><button type="button" class="btn primary" data-live-action="new-study">+ Nouvelle étude</button></header>'+
      '<div class="card-body"><div class="live-study-list">'+
      db.studies.map(st=>'<div class="live-study-row"><div><strong>'+esc(st.name)+'</strong><small>'+esc(st.id)+(st.archived?" · archivée":"")+'</small></div><div>'+
      '<button type="button" class="btn '+(st.id===selected?.id?"primary":"secondary")+' small" data-live-open="'+esc(st.id)+'">'+(st.id===selected?.id?"Dossier actif":"Ouvrir")+'</button> '+
      '<button type="button" class="btn secondary small" data-live-duplicate="'+esc(st.id)+'">Dupliquer</button> '+
      '<button type="button" class="btn danger small" data-live-archive="'+esc(st.id)+'">'+(st.archived?"Restaurer":"Archiver")+'</button></div></div>').join("")+
      '</div></div>';
    $(".section-head",section)?.insertAdjacentElement("afterend",article);
    for(const old of $$(".card",section)){if(old!==article)old.classList.add("live-original-list")}
  }
  function clientsPanel(section){
    $("#live-clients",section)?.remove();
    const db=read(),article=document.createElement("article");
    article.className="card";article.id="live-clients";
    article.innerHTML='<header class="card-head"><div><h2>Clients de démonstration</h2><p>Créez un client, puis réutilisez-le dans le dossier actif.</p></div></header><div class="card-body">'+
      '<div class="live-client-create"><label>Prénom<input class="input" data-live-client="firstName" placeholder="Prénom"></label><label>Nom<input class="input" data-live-client="lastName" placeholder="Nom"></label><label>Commune<input class="input" data-live-client="city" placeholder="Commune"></label><button class="btn primary" type="button" data-live-action="create-client">Ajouter le client</button></div>'+
      '<div class="live-client-list">'+db.clients.map(c=>'<div class="live-study-row"><strong>'+esc(c.firstName+" "+c.lastName)+" — "+esc(c.city)+'</strong><button type="button" class="btn secondary small" data-live-select-client="'+esc(c.id)+'">Utiliser dans le dossier</button></div>').join("")+'</div></div>';
    $(".section-head",section)?.insertAdjacentElement("afterend",article);
    for(const old of $$(".card",section)){if(old!==article)old.classList.add("live-original-list")}
  }

  // Outils de plan de démonstration réellement interactifs.
  // Le fond est un repère métrique local, PAS un plan géoréférencé.
  function plan(section){
    const db=read(),st=current(db);if(!st)return;
    const width=Number(st.fields["geometry.width"]||$('input[data-path="geometry.width"]',section)?.value)||80;
    const height=Number(st.fields["geometry.height"]||$('input[data-path="geometry.height"]',section)?.value)||60;
    if(!st.plan)st.plan={mode:"trench",points:[],width,height};
    st.plan.width=Math.max(1,Math.min(500,width));
    st.plan.height=Math.max(1,Math.min(500,height));
    save(db);
    $("#live-plan",section)?.remove();
    const card=document.createElement("article");
    card.className="card";card.id="live-plan";
    card.innerHTML='<header class="card-head"><div><h2>Plan de démonstration interactif</h2><p>Choisir « Tracer une tranchée » puis cliquer sur le plan pour placer des points. Les distances en mètres sont mesurées dans un repère local fictif — aucune donnée cadastrale réelle.</p></div></header>'+
      '<div class="card-body"><div class="live-plan-buttons">'+
      '<button type="button" class="btn primary" data-live-plan="trench">Tracer une tranchée</button>'+
      '<button type="button" class="btn secondary" data-live-plan="house">Placer la maison</button>'+
      '<button type="button" class="btn secondary" data-live-plan="undo">Annuler le dernier point</button>'+
      '<button type="button" class="btn secondary" data-live-plan="clear">Effacer le plan</button>'+
      '<button type="button" class="btn secondary" data-live-plan="geojson">Exporter GeoJSON local</button></div>'+
      '<svg class="live-plan-svg" viewBox="0 0 800 500" tabindex="0" role="img" aria-label="Plan interactif fictif, cliquez pour placer les points de tranchée"></svg>'+
      '<div class="live-plan-summary" aria-live="polite"></div>'+
      '<p class="small-text">Schéma d’essai uniquement : échelle locale définie par les dimensions saisies, à contrôler par un géomètre ou le bureau d’études.</p></div>';
    const head=$(".section-head",section);
    if(head)head.insertAdjacentElement("afterend",card);
    else section.prepend(card);
    const svg=$(".live-plan-svg",card);
    svg.addEventListener("click",e=>{
      const bb=svg.getBoundingClientRect();
      const x=Math.max(0,Math.min(st.plan.width,(e.clientX-bb.left)/bb.width*st.plan.width));
      const y=Math.max(0,Math.min(st.plan.height,(e.clientY-bb.top)/bb.height*st.plan.height));
      const latest=read(),study=current(latest);if(!study)return;
      if(study.plan.mode==="house")study.plan.house={x,y};
      else study.plan.points.push({x,y});
      save(latest);renderPlan(card,study.plan);
    });
    renderPlan(card,st.plan);
  }
  function geometryLength(plan){
    const arr=plan?.points||[];let length=0;
    for(let i=1;i<arr.length;i++)length+=Math.hypot(arr[i].x-arr[i-1].x,arr[i].y-arr[i-1].y);
    return length;
  }
  function renderPlan(card,planData){
    const svg=$(".live-plan-svg",card),summary=$(".live-plan-summary",card);
    if(!svg)return;
    const W=planData.width||80,H=planData.height||60;
    const ns="http://www.w3.org/2000/svg";
    svg.replaceChildren();
    function node(tag,attrs,parent=svg){
      const n=document.createElementNS(ns,tag);
      for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
      parent.appendChild(n);return n;
    }
    node("rect",{x:0,y:0,width:800,height:500,fill:"#eff7fb"});
    for(let i=0;i<=10;i++){
      const x=i*80,y=i*50;
      node("line",{x1:x,y1:0,x2:x,y2:500,stroke:"#c9ddeb"});
      node("line",{x1:0,y1:y,x2:800,y2:y,stroke:"#c9ddeb"});
    }
    node("rect",{x:12,y:12,width:776,height:476,rx:5,fill:"none",stroke:"#2c8a69","stroke-width":3,"stroke-dasharray":"8 5"});
    const points=planData.points||[];
    if(points.length>1){
      node("polyline",{points:points.map(p=>(p.x/W*800)+","+(p.y/H*500)).join(" "),fill:"none",stroke:"#1475d2","stroke-width":6,"stroke-linejoin":"round"});
    }
    for(const [index,p] of points.entries()){
      const x=p.x/W*800,y=p.y/H*500;
      node("circle",{cx:x,cy:y,r:6,fill:"#0d65c0",stroke:"white","stroke-width":2});
      const txt=node("text",{x:x+10,y:y-10,fill:"#143c68","font-size":14,"font-weight":800});
      txt.textContent="T"+(index+1);
    }
    if(planData.house){
      const h=planData.house,x=h.x/W*800,y=h.y/H*500;
      node("rect",{x:x-16,y:y-16,width:32,height:32,rx:2,fill:"#ef9945",stroke:"#945b1f","stroke-width":2});
      const t=node("text",{x:x+20,y:y+5,fill:"#865424","font-size":14});t.textContent="Maison";
    }
    const length=geometryLength(planData);
    if(summary)summary.textContent=
      "Dimensions fictives : "+W+" × "+H+" m · "+
      points.length+" point(s) de tranchée · Longueur dessinée : "+length.toLocaleString("fr-FR",{maximumFractionDigits:2})+" m"+
      " · Outil actif : "+(planData.mode==="house"?"Maison":"Tranchée");
  }
  function planAction(el){
    if(!el.dataset.livePlan)return false;
    const db=read(),st=current(db);if(!st||!st.plan)return true;
    const mode=el.dataset.livePlan;
    if(mode==="trench"||mode==="house")st.plan.mode=mode;
    else if(mode==="undo")st.plan.points.pop();
    else if(mode==="clear"){st.plan.points=[];delete st.plan.house;}
    else if(mode==="geojson"){
      const features=[];
      if(st.plan.points.length>1)features.push({type:"Feature",properties:{kind:"trench",crs:"LOCAL_METRIC_DEMO"},geometry:{type:"LineString",coordinates:st.plan.points.map(p=>[p.x,p.y])}});
      if(st.plan.house)features.push({type:"Feature",properties:{kind:"house",crs:"LOCAL_METRIC_DEMO"},geometry:{type:"Point",coordinates:[st.plan.house.x,st.plan.house.y]}});
      const json=JSON.stringify({type:"FeatureCollection",features},null,2);
      const uri=URL.createObjectURL(new Blob([json],{type:"application/geo+json"}));
      const a=document.createElement("a");a.href=uri;a.download="anc-plan-local-demo.geojson";a.click();
      setTimeout(()=>URL.revokeObjectURL(uri),500);
      notice("Plan fictif exporté. Coordonnées locales non géoréférencées.");
      return true;
    }
    save(db);const card=$("#live-plan");if(card)renderPlan(card,st.plan);
    return true;
  }
  function report(section){
    const db=read(),st=current(db);if(!st)return;
    const source=st.fields||{};
    const porchet=st.porchet?JSON.parse(st.porchet):{};
    const sheets=porchet.sheets||{};
    const formula=window.ANCPorchetExcel?.calculate;
    const krows=[];
    for(const key of ["KP1","KP2","KP3","KP4"]){
      const item=sheets[key];if(!item||!formula)continue;
      const result=formula(item);
      krows.push({key,mean:result.mean,graphical:result.graphical,complete:result.complete});
    }
    const boreholes=(st.cells?.sondages||[]).map((entry,i)=>{
      const f=entry.fields||{},pick=(p)=>Object.entries(f).find(([key])=>key.endsWith(p))?.[1]||"";
      return {name:pick(".label")||"S"+(i+1),depth:pick(".depth"),slope:pick(".slope"),classification:pick(".classification"),horizons:Object.entries(f).filter(([k])=>/horizons\.\d+\.soil$/.test(k)).map(([,v])=>v)};
    });
    const title=source.title||st.name;
    const ref=source.reference||st.id;
    const first=source["owner.firstName"]||"",last=source["owner.lastName"]||"";
    const commune=source["parcel.city"]||"Commune non renseignée";
    const page=$("#axis-report-page",section);
    if(!page)return;
    page.innerHTML='<div style="padding:20mm 17mm;font-family:Arial,sans-serif;color:#263b52">'+
      '<h1 style="color:#164a82">SPEEDARTI ANC — Rapport de démonstration</h1>'+
      '<div class="notice warn"><strong>SPÉCIMEN — VALIDATION PROFESSIONNELLE OBLIGATOIRE.</strong> Ceci est un récapitulatif de vos saisies, pas une étude validée.</div>'+
      '<h2>'+esc(title)+'</h2><p><strong>Référence :</strong> '+esc(ref)+'<br><strong>Client :</strong> '+esc((first+" "+last).trim())+
      '<br><strong>Commune :</strong> '+esc(commune)+'<br><strong>Surface parcelle :</strong> '+esc(source["parcel.totalArea"]||"À vérifier")+' m²</p>'+
      '<h2>Sondages saisis</h2><table style="width:100%;border-collapse:collapse"><tr><th>Sondage</th><th>Profondeur</th><th>Pente</th><th>Classification</th></tr>'+
      (boreholes.length?boreholes.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.depth)+' cm</td><td>'+esc(x.slope)+' %</td><td>'+esc(x.classification)+'</td></tr>').join(""):'<tr><td colspan="4">Aucun sondage saisi</td></tr>')+
      '</table><h2>Essais Porchet — Excel Fred</h2><table style="width:100%;border-collapse:collapse"><tr><th>Essai</th><th>K moyen (mm/h)</th><th>K graphique (mm/h)</th></tr>'+
      (krows.length?krows.map(x=>'<tr><td>'+esc(x.key)+'</td><td>'+(x.mean===null?"Non calculé":x.mean.toFixed(3))+'</td><td>'+(x.graphical===null?"Non calculé":x.graphical.toFixed(3))+'</td></tr>').join(""):'<tr><td colspan="3">Aucun essai Porchet saisi</td></tr>')+'</table>'+
      '<h2>Plan de démonstration</h2><p>'+(st.plan
        ? 'Longueur des tracés dans le repère métrique local : '+geometryLength(st.plan).toFixed(2)+' m (non géoréférencé, à confirmer).'
        : 'Aucun tracé réalisé.')+'</p>'+
      '<p><strong>Contrôles requis :</strong> vérifier les mesures, la stabilité, le choix de la valeur K et les règles applicables avant toute conclusion technique.</p>'+
      '<p style="margin-top:30px;border-top:1px solid #ddd;padding-top:10px">Le professionnel valide les résultats et le rapport définitif.</p></div>';
    for(const other of $$("#report-pages > :not(#axis-report-page)",section))other.hidden=true;
  }
  function beforeNavigate(){
    const section=$("#public-sections section");if(!section)return;
    captureFieldState(section);storeCellSnapshot(section);
  }
  function mount(section,slug){
    bindFields(section);
    if(slug==="dossier"){
      const db=read(),st=current(db);
      if(st&&st.isNew&&!Object.keys(st.fields).length){
        for(const el of $("[data-path]",section)){
          if(el.matches("input:not([type=hidden]),textarea"))el.value="";
          if(el.matches("select"))el.selectedIndex=0;
        }
        const title=$('[data-path="title"]',section);
        if(title)title.value=st.name;
        const reference=$('[data-path="reference"]',section);
        if(reference)reference.value=st.id;
      }
      updateParcelTotal();
    }
    if(slug==="sondages"){restoreBoreholes(section);syncMultiselects(section)}
    if(slug==="geometrie")plan(section);
    if(slug==="etudes")studiesPanel(section);
    if(slug==="clients")clientsPanel(section);
    if(slug==="rapport")report(section);
    const db=read(),st=current(db);
    if(st){$("[data-live-current-study]")?.replaceChildren(document.createTextNode(st.name))}
    status(true);
  }
  function switchStudy(key){
    const db=read(),target=db.studies.find(x=>x.id===key);
    if(!target)return;
    beforeNavigate();
    const renewed=read();
    renewed.activeId=key;
    save(renewed);loadPorchet(target);
    // L'ancien moteur stocke des copies d'écran sans structure par dossier.
    // Les vider à chaque changement évite le mélange entre études.
    localStorage.removeItem("speedarti-anc-public-sprint4-v1");
    window.location.hash="dossier";
    window.location.reload();
  }
  function duplicateStudy(key){
    const db=read(),src=db.studies.find(x=>x.id===key);if(!src)return;
    const copy=JSON.parse(JSON.stringify(src));
    copy.id=id();copy.name=(copy.name||"Étude")+" — copie";copy.archived=false;
    db.studies.push(copy);save(db);notice("Dossier dupliqué, indépendant de l'original.");
    window.ANCPublicNavigate?.("etudes");
  }

  function createVersion(){
    beforeNavigate();
    const db=read(),st=current(db);if(!st)return false;
    st.versions=st.versions||[];
    st.versions.push({
      at:new Date().toISOString(),fields:structuredClone(st.fields),
      cells:structuredClone(st.cells),porchet:st.porchet
    });
    if(st.versions.length>8)st.versions.shift();
    const ok=save(db);
    notice(ok?"Version du dossier enregistrée dans ce navigateur.":"Impossible d'enregistrer la version.");
    return true;
  }
  function exportedData(){
    beforeNavigate();
    const body=JSON.stringify({type:"ANC_DEMONSTRATION_V3",version:1,data:read()},null,2);
    const blob=new Blob([body],{type:"application/json"});
    const uri=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=uri;a.download="speedarti-anc-demo-dossier.json";
    a.click();setTimeout(()=>URL.revokeObjectURL(uri),500);
    notice("Dossier de démonstration exporté en JSON.");
  }
  function importData(){
    const input=document.createElement("input");
    input.type="file";input.accept=".json,application/json";
    input.addEventListener("change",async()=>{
      const file=input.files?.[0];if(!file)return;
      try{
        if(file.size>5*1024*1024)throw Error("Fichier trop volumineux.");
        const payload=JSON.parse(await file.text());
        if(payload.type!=="ANC_DEMONSTRATION_V3"||payload.version!==1)throw Error("Fichier de démonstration incompatible.");
        const db=payload.data;
        if(!db||!Array.isArray(db.studies)||db.studies.length>30||db.studies.length===0||
           !Array.isArray(db.clients)||db.clients.length>100||
           !db.studies.some(st=>st.id===db.activeId))throw Error("Structure du dossier non valide.");
        const clean={
          version:1,activeId:db.activeId,updatedAt:new Date().toISOString(),
          studies:db.studies.map(st=>{
            if(typeof st.id!=="string"||st.id.length>100)throw Error("Identifiant invalide.");
            const validFields={};
            if(!st.fields||typeof st.fields!=="object")throw Error("Champs absents.");
            for(const [k,v] of Object.entries(st.fields)){
              if(k.length>130||typeof v!=="string"&&typeof v!=="number"&&typeof v!=="boolean"&&!Array.isArray(v))
                throw Error("Champ incorrect.");
              validFields[k]=Array.isArray(v)?v.filter(x=>typeof x==="string").slice(0,80):v;
            }
            // Les fragments HTML tiers ne sont pas importés (protection XSS).
            return {id:st.id,name:String(st.name||"Étude importée").slice(0,160),
              fields:validFields,cells:{},toggles:{},
              porchet:typeof st.porchet==="string"&&st.porchet.length<120000?st.porchet:null,
              archived:!!st.archived,createdAt:String(st.createdAt||""),
              versions:[]};
          }),
          clients:db.clients.map(c=>({
            id:String(c.id||id()),firstName:String(c.firstName||"").slice(0,120),
            lastName:String(c.lastName||"").slice(0,120),city:String(c.city||"").slice(0,120)
          }))
        };
        if(!save(clean))throw Error("Stockage local indisponible.");
        loadPorchet(current(clean));
        localStorage.removeItem("speedarti-anc-public-sprint4-v1");
        location.hash="etudes";location.reload();
      }catch(error){notice("Import impossible : "+error.message);}
    },{once:true});
    input.click();
  }
  function topAction(name){
    if(name==="reset"){
      localStorage.removeItem(KEY);
      localStorage.removeItem("speedarti-anc-public-sprint4-v1");
      localStorage.removeItem(PORCHET_KEY);
      location.hash="etudes";location.reload();
      return true;
    }
    if(name==="version")return createVersion();
    if(name==="calculate"){
      beforeNavigate();
      window.ANCPublicNavigate?.("rapport");
      notice("Rapport actualisé avec les informations réellement saisies. Les calculs réglementaires nécessitent la validation du professionnel.");
      return true;
    }
    if(name==="export"){exportedData();return true}
    if(name==="import"){importData();return true}
    return false;
  }
  function action(event){
    const el=event.target.closest("button");if(!el)return false;
    if(el.dataset.livePlan)return planAction(el);
    const cmd=el.dataset.liveAction;
    if(cmd==="new-study"||el.dataset.action==="new-study"){
      beforeNavigate();const db=read();const st=fresh();db.studies.push(st);save(db);switchStudy(st.id);return true;
    }
    if(cmd==="create-client"||el.dataset.action==="new-client-from-draft"){
      const section=$("#clients");const data={};
      for(const input of $$("[data-live-client]",section))data[input.dataset.liveClient]=input.value.trim();
      if(!data.lastName)return notice("Renseigner le nom du client."),true;
      data.id=id();const db=read();db.clients.push(data);save(db);
      window.ANCPublicNavigate?.("clients");notice("Client créé pour cette démo.");return true;
    }
    if(el.dataset.liveOpen){switchStudy(el.dataset.liveOpen);return true}
    if(el.dataset.liveDuplicate){duplicateStudy(el.dataset.liveDuplicate);return true}
    if(el.dataset.liveArchive){
      const db=read(),st=db.studies.find(x=>x.id===el.dataset.liveArchive);
      if(st){st.archived=!st.archived;save(db);window.ANCPublicNavigate?.("etudes")}
      return true;
    }
    if(el.dataset.liveSelectClient){
      const db=read(),st=current(db),c=db.clients.find(x=>x.id===el.dataset.liveSelectClient);
      if(st&&c){
        st.fields["owner.firstName"]=c.firstName;st.fields["owner.lastName"]=c.lastName;
        st.fields["parcel.city"]=c.city;save(db);
        window.ANCPublicNavigate?.("dossier");notice("Client affecté au dossier.");
      }
      return true;
    }
    return false;
  }
  document.addEventListener("input",event=>{
    const el=event.target;
    if(el.closest("#public-sections")&&el.dataset?.path){
      commitElement(el);
      if(el.classList.contains("anc-p-surface"))updateParcelTotal();
    }
  },true);
  document.addEventListener("change",event=>{
    const el=event.target;
    if(el.closest(".axis-touch-soils")&&el.matches('input[type="checkbox"]'))onMultiSelect(el);
    if(el.dataset?.path&&el.closest("#public-sections"))commitElement(el);
  },true);
  function mutateStudy(callback){const db=read(),st=current(db);if(!st)return null;callback(st);save(db);return st;}
  window.ANCRealWorkflow={mount,beforeNavigate,handle:action,report,topAction,getStudy:()=>current(read()),mutateStudy};
})();