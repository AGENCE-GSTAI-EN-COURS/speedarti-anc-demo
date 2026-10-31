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
  const fresh=(title="Nouvelle étude de démonstration")=>({id:id(),name:title,createdAt:new Date().toISOString(),fields:{},cells:{},toggles:{},porchet:null,archived:false});
  function initial(){const example=fresh("Étude ANC — exemple");return {version:1,activeId:example.id,studies:[example],clients:[],updatedAt:new Date().toISOString()};}
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
    if($("#live-studies",section))return;
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
    if($("#live-clients",section))return;
    const db=read(),article=document.createElement("article");
    article.className="card";article.id="live-clients";
    article.innerHTML='<header class="card-head"><div><h2>Clients de démonstration</h2><p>Créez un client, puis réutilisez-le dans le dossier actif.</p></div></header><div class="card-body">'+
      '<div class="live-client-create"><label>Prénom<input class="input" data-live-client="firstName" placeholder="Prénom"></label><label>Nom<input class="input" data-live-client="lastName" placeholder="Nom"></label><label>Commune<input class="input" data-live-client="city" placeholder="Commune"></label><button class="btn primary" type="button" data-live-action="create-client">Ajouter le client</button></div>'+
      '<div class="live-client-list">'+db.clients.map(c=>'<div class="live-study-row"><strong>'+esc(c.firstName+" "+c.lastName)+" — "+esc(c.city)+'</strong><button type="button" class="btn secondary small" data-live-select-client="'+esc(c.id)+'">Utiliser dans le dossier</button></div>').join("")+'</div></div>';
    $(".section-head",section)?.insertAdjacentElement("afterend",article);
    for(const old of $$(".card",section)){if(old!==article)old.classList.add("live-original-list")}
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
    if(slug==="dossier")updateParcelTotal();
    if(slug==="sondages"){restoreBoreholes(section);syncMultiselects(section)}
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
  function action(event){
    const el=event.target.closest("button");if(!el)return false;
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
  window.ANCRealWorkflow={mount,beforeNavigate,handle:action,report};
})();