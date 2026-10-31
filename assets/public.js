/* SpeedArti ANC V3 — navigateur public, SANS moteur de calcul ni connexion réseau externe. */
(()=>{
  "use strict";
  const tabs=[
    ["etudes","🗂️","Études"],["clients","👥","Clients"],
    ["dossier","🏠","Dossier"],["terrain","📋","Fiche chantier"],
    ["sondages","⛏️","Sondages"],["porchet","🧪","Porchet"],
    ["geometrie","📐","Plan & métrés"],["photos","📷","Photos"],
    ["cartes","🗺️","Cartes dossier"],["automatisation","✨","Automatisation"],
    ["regles","⚙️","Règles"],["controles","✅","Contrôles"],
    ["tests","🧰","Tests"],["rapport","📄","Rapport"]
  ];
  const tabNames=new Map(tabs.map(t=>[t[0],t[2]]));
  const nav=document.getElementById("public-tabs");
  const viewport=document.getElementById("public-sections");
  const cache=new Map();
  const toastEl=document.getElementById("public-toast");
  let token=0,toastTimeout;
  const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  nav.innerHTML=tabs.map(([slug,emoji,label])=>'<button class="tab" type="button" data-tab="'+slug+'"><span>'+emoji+'</span>'+escapeHtml(label)+'</button>').join("");

  function toast(message){
    clearTimeout(toastTimeout);
    toastEl.textContent=message;toastEl.hidden=false;
    toastTimeout=setTimeout(()=>{toastEl.hidden=true;},6500);
  }
  async function loadSection(slug){
    if(cache.has(slug))return cache.get(slug);
    const response=await fetch("./sections/"+slug+".html",{cache:"no-cache"});
    if(!response.ok)throw Error("Vue "+slug+" indisponible ("+response.status+")");
    const html=await response.text();
    // Les fichiers publics sont générés uniquement depuis un jeu de données factices.
    const doc=new DOMParser().parseFromString(html,"text/html");
    if(doc.querySelector("script"))throw Error("Script inattendu dans la section "+slug);
    const el=doc.querySelector("section#"+slug);
    if(!el)throw Error("Structure manquante pour "+slug);
    el.querySelectorAll("script,iframe,object,embed").forEach(x=>x.remove());
    const sanitized=el.outerHTML;
    cache.set(slug,sanitized);
    return sanitized;
  }

  async function navigate(slug,scroll=true){
    if(!tabNames.has(slug))return;
    const thisToken=++token;
    window.ANCRealWorkflow?.beforeNavigate?.();
    window.ANCDemoEngine?.saveCurrent?.();
    nav.querySelectorAll(".tab").forEach(button=>{
      const on=button.dataset.tab===slug;
      button.classList.toggle("active",on);
      if(on)button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
    });
    document.documentElement.dataset.tab=slug;
    history.replaceState(null,"","#"+slug);
    document.title="SpeedArti ANC V3 — "+tabNames.get(slug);
    try{
      const html=await loadSection(slug);
      if(thisToken!==token)return;
      viewport.innerHTML=html;
      const section=viewport.querySelector("section");
      if(section){
        section.classList.add("active");
        try {window.ANCDemoEngine?.mount?.(section,slug);}
        catch(err){console.error("ANC demo legacy mount",slug,err);}
        const mounted=viewport.querySelector("section");
        try {window.ANCDemoEngine?.addHorizonButtons?.(mounted);}
        catch(err){console.error("ANC demo horizons",slug,err);}
        try {window.ANCRealWorkflow?.mount?.(mounted,slug);}
        catch(err){
          console.error("ANC demo real workflow mount",slug,err);
          window.__ancMountError={page:slug,message:String(err?.message||err)};
        }
      }
      if(scroll)window.scrollTo({top:0,behavior:"auto"});
    }catch(error){
      if(thisToken!==token)return;
      viewport.textContent="La vue ANC V3 n'a pas pu être chargée. Réessayez ou consultez le dépôt GitHub public.";
      console.error(error);
    }
  }

  window.ANCPublicNavigate=navigate;
  nav.addEventListener("click",event=>{
    const button=event.target.closest("button[data-tab]");
    if(button)navigate(button.dataset.tab);
  });

  // Autoriser seulement les déplacements entre écrans, l'édition locale de champs
  // et l'impression du spécimen ; interdire les calculs et actions métier non publiés.
  document.addEventListener("click",event=>{
    // Les onglets internes du tableur Porchet appartiennent exclusivement à celui-ci.
    if(event.target.closest("[data-px-tab]"))return;
    const action=event.target.closest("[data-public-action]");
    if(action){
      const name=action.dataset.publicAction;
      event.preventDefault();
      if(name==="print"){navigate("rapport").then(()=>window.print());}
      else if(window.ANCRealWorkflow?.topAction?.(name)){/* action réelle du dossier */}
      else if(window.ANCDemoEngine?.topAction?.(name)){/* repli */}
      else toast("Cette action n'est pas disponible dans le parcours public.");
      return;
    }
    if(window.ANCRealWorkflow?.handle?.(event)){event.preventDefault();return;}
    if(window.ANCDemoEngine?.handle?.(event)){event.preventDefault();return;}
    const external=event.target.closest("#public-sections a[href]");
    if(external){return;}
    const button=event.target.closest("#public-sections button");
    if(button&&button.classList.contains("axis-ann-add")){
      event.preventDefault();
      const list=document.getElementById("axis-annotation-list");
      if(list){
        const row=document.createElement("div");
        row.className="axis-card public-example-annotation";
        row.innerHTML='<div class="axis-grid"><div class="field"><label>Type</label><select class="select"><option>Cotation</option><option>Fil d’eau</option><option>Cote terrain</option></select></div><div class="field"><label>Libellé</label><input class="input" value="Exemple de cote"></div><div class="field"><label>Valeur fictive</label><input class="input" value=""></div><div class="field"><label>Origine de la cote</label><select class="select axis-ann-quality"><option value="TO_CONFIRM">À vérifier</option><option value="MEASURED">Mesurée sur site</option><option value="ESTIMATED">Estimée — provisoire</option></select></div></div><div class="notice warn" style="margin-top:8px">SPÉCIMEN — aucune mesure réelle ni validation professionnelle.</div>';
        list.appendChild(row);
        toast("Cote fictive ajoutée dans cette vue uniquement. Aucun métrage ou calcul n’a été exécuté.");
      }
      return;
    }
    if(button){
      event.preventDefault();
      // Une vue de dossier peut demander d'ouvrir un onglet existant.
      const target=button.getAttribute("data-tab");
      if(target&&tabNames.has(target)){navigate(target);return;}
      toast("Cette action ne dispose pas encore d’une simulation publique.");
    }
  },true);

  window.addEventListener("hashchange",()=>{
    const slug=location.hash.slice(1);
    if(tabNames.has(slug))navigate(slug,false);
  });
  navigate(tabNames.has(location.hash.slice(1))?location.hash.slice(1):"etudes",false);
})();
