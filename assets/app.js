/* Vitrine SpeedArti ANC : aucune formule, aucune connexion, aucune donnée privée. */
(function(){
  "use strict";
  const pages=[...document.querySelectorAll("[data-page]")];
  const tabs=[...document.querySelectorAll(".nav-link")];
  const byPage=new Map(pages.map(p=>[p.dataset.page,p]));
  const names={overview:"Vue d'ensemble",dossier:"Dossier ANC",soil:"Sondages & sols",porchet:"Essai Porchet",plan:"Implantation",infiltration:"Infiltration",report:"Rapport",angel:"Ángel"};
  function setText(id,value){
    const el=document.getElementById(id);
    if(!el)return;
    if(el.tagName==="INPUT"||el.tagName==="TEXTAREA")el.value=value;
    else el.textContent=value;
  }
  function navigate(name,updateHash=true){
    const selected=byPage.get(name);
    if(!selected)return;
    pages.forEach(p=>{p.hidden=p!==selected;p.classList.toggle("active",p===selected);});
    tabs.forEach(t=>{
      const active=t.dataset.target===name;
      t.classList.toggle("active",active);
      if(active)t.setAttribute("aria-current","page");else t.removeAttribute("aria-current");
    });
    setText("breadcrumb-current",names[name]);
    document.title="SpeedArti — "+names[name];
    if(updateHash)history.replaceState(null,"","#/"+name);
    window.scrollTo({top:0,behavior:"auto"});
  }
  document.querySelectorAll("[data-target]").forEach(button=>{
    button.addEventListener("click",()=>navigate(button.dataset.target));
  });
  addEventListener("hashchange",()=>{
    const name=location.hash.replace(/^#\//,"");
    if(byPage.has(name))navigate(name,false);
  });
  const initial=location.hash.replace(/^#\//,"");
  if(byPage.has(initial))navigate(initial,false);

  /* Scénarios préécrits : l'écran n'exécute aucun calcul d'ANC. */
  const examples={
    house:{
      eh:"5 EH",k:"45 mm/h",area:"8,33 m²",trench:"12 m",
      soil1:["Limon","Argile"],soil2:["Argile","Calcaire"],
      message:"Exemple prérempli : aucune donnée n'est recalculée lors du changement de scénario.",
      warning:"Toute décision d'implantation ou de filière nécessite une validation professionnelle."
    },
    constrained:{
      eh:"5 EH",k:"9 mm/h",area:"À réévaluer",trench:"Non proposé",
      soil1:["Argile","Limon"],soil2:["Argile compacte","Hydromorphie"],
      message:"Scénario fictif : perméabilité présentée comme faible, sans dimensionnement automatique.",
      warning:"Conditions de sol à approfondir : la filière doit être étudiée par le professionnel."
    },
    complex:{
      eh:"À confirmer",k:"Non mesuré",area:"À confirmer",trench:"À confirmer",
      soil1:["Limon","À vérifier"],soil2:["Sol hétérogène","À vérifier"],
      message:"Scénario fictif incomplet : les informations absentes restent signalées.",
      warning:"Données insuffisantes : aucune filière ne doit être validée à partir de cet exemple."
    }
  };
  function showTags(id,items){
    const parent=document.getElementById(id);
    if(!parent)return;
    parent.replaceChildren();
    items.forEach(item=>{
      const span=document.createElement("span");
      span.textContent=item;parent.appendChild(span);
    });
  }
  function applyScenario(key){
    const s=examples[key]||examples.house;
    ["field-eh","stat-eh"].forEach(id=>setText(id,s.eh));
    ["stat-k","porchet-k"].forEach(id=>setText(id,s.k));
    setText("stat-area",s.area);
    setText("stat-trench",s.trench);
    setText("scenario-message",s.message);
    setText("scenario-warning",s.warning);
    showTags("soil-tags-one",s.soil1);
    showTags("soil-tags-two",s.soil2);
  }
  const select=document.getElementById("scenario-select");
  if(select)select.addEventListener("change",()=>applyScenario(select.value));
  applyScenario("house");

  /* L'affichage du plan modifie seulement la visibilité d'éléments SVG fictifs. */
  [["show-trenches","plan-trenches"],["show-well","plan-well"]].forEach(pair=>{
    const checkbox=document.getElementById(pair[0]);
    const graphic=document.getElementById(pair[1]);
    if(!checkbox||!graphic)return;
    function sync(){graphic.style.display=checkbox.checked?"":"none";}
    checkbox.addEventListener("change",sync);sync();
  });

  /* Pas de stockage local, pas de serveur et pas de transmission. */
  const save=document.getElementById("demo-save");
  if(save)save.addEventListener("click",()=>{
    const ref=document.getElementById("field-reference").value.trim();
    const project=document.getElementById("field-project").value.trim();
    if(!ref||!project){
      setText("save-feedback","Référence et nom de projet obligatoires.");return;
    }
    setText("report-reference",ref);
    setText("report-project",project);
    setText("save-feedback","Aperçu modifié pour cette visite uniquement.");
  });

  const print=document.getElementById("print-sample");
  if(print)print.addEventListener("click",()=>window.print());

  /* Simulateur de dialogue : réponses locales pré-écrites, aucune IA. */
  const chat=document.getElementById("chat-messages");
  const chatInput=document.getElementById("chat-input");
  function append(role,message){
    if(!chat)return;
    const bubble=document.createElement("div");
    bubble.className="bubble "+role;
    const strong=document.createElement("strong");
    strong.textContent=role==="user"?"Vous":"Ángel · Simulation";
    const paragraph=document.createElement("p");
    paragraph.textContent=message;
    bubble.append(strong,paragraph);
    chat.appendChild(bubble);
    chat.scrollTop=chat.scrollHeight;
  }
  function reply(q){
    q=q.toLocaleLowerCase("fr-FR");
    if(q.includes("porchet")||q.includes("perméabilit"))
      return "Dans le vrai module, je pourrais retrouver les relevés Porchet et identifier les mesures à vérifier. Aucune formule n'est exécutée dans cette démo ; le professionnel doit valider le résultat.";
    if(q.includes("sondage")||q.includes("horizon")||q.includes("sol"))
      return "Chaque sondage peut comporter plusieurs horizons, types de sol et observations. Les données absentes restent à compléter sur le terrain.";
    if(q.includes("rapport")||q.includes("document"))
      return "Je pourrais préparer un projet de rapport à partir du dossier, à faire relire et valider avant toute publication.";
    if(q.includes("plan")||q.includes("distance")||q.includes("implant"))
      return "Le moteur privé contient les fonctions de métrés. Le plan visible ici n'est ni géoréférencé ni à l'échelle.";
    if(q.includes("tranch")||q.includes("infiltr"))
      return "La version réelle doit proposer un dimensionnement justifié par des mesures et des règles validées. Ici les exemples sont figés.";
    return "Ceci est une réponse pré-écrite de démonstration. Le véritable Ángel doit rester relié aux connaissances autorisées de SpeedArti et ne valide jamais une étude à la place du professionnel.";
  }
  function ask(question){
    question=String(question||"").trim().slice(0,160);
    if(!question)return;
    append("user",question);
    append("assistant",reply(question));
  }
  document.querySelectorAll(".prompt-example").forEach(b=>b.addEventListener("click",()=>ask(b.dataset.question)));
  const form=document.getElementById("chat-form");
  if(form&&chatInput)form.addEventListener("submit",event=>{
    event.preventDefault();
    ask(chatInput.value);
    chatInput.value="";
    chatInput.focus();
  });
})();