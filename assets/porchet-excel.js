/* PORCHET — Interface fidèlement reconstruite depuis
 * "FL AEC tableur MATRICE_essai_porchet_classique_fr v2.xlsm" (Fred).
 * Colonnes, temps et équations : feuilles Exemple, KP1, KP2, KP3, KP4.
 * Saisie jaune uniquement, enregistrement automatique.
 * Calcul de référence EXCEL indicatif : validation professionnelle requise.
 */
(() => {
"use strict";
const TIMES=[0,1,2,3,4,5,10,15,20,25,30];
const KEYS=["Exemple","KP1","KP2","KP3","KP4"];
const PUBLIC_KEY="speedarti-anc-public-porchet-excel-v1";
const EXAMPLE=Object.freeze({
  ref:"KP??",diameter:"150",depth:"600",height:"150",calibration:"1.568",
  graduations:["1180","1173","1166","1160","1153","1146","1111","1076","1041","1006","970"],
  slope:"10.92",soil:"",date:"",name:"",technician:"",commune:"",analyst:""
});
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=value=>{
  if(value===null||value===undefined||String(value).trim()==="")return null;
  const candidate=Number(String(value).trim().replace(/\s/g,"").replace(",","."));
  return Number.isFinite(candidate)?candidate:null;
};
const format=(x,d=2)=>x===null||!Number.isFinite(x)?"—":new Intl.NumberFormat("fr-FR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(x);
const fmtTiny=x=>x===null||!Number.isFinite(x)?"—":x.toExponential(3).replace(".",",");
const empty=()=>({ref:"",diameter:"",depth:"",height:"",calibration:"1.568",graduations:TIMES.map(()=>""),slope:"",soil:""});
const defaultBook=()=>({version:1,active:"KP1",fields:{},sheets:{KP1:empty(),KP2:empty(),KP3:empty(),KP4:empty()}});
const privateState=()=>window.SpeedArtiANC?.getState?.()||null;
function publicBook(){
 try{
  const value=JSON.parse(localStorage.getItem(PUBLIC_KEY)||"null");
  return value&&typeof value==="object"&&value.sheets?value:defaultBook();
 }catch{return defaultBook();}
}
function getBook(){
 const st=privateState();
 if(st){if(!st.porchetExcel||st.porchetExcel.version!==1)st.porchetExcel=defaultBook();return st.porchetExcel;}
 return publicBook();
}
function writeBook(book){
 const current=book||getBook();
 const st=privateState();
 if(st){linkPrivate(st,current);window.SpeedArtiANC.save?.();return true;}
 try{localStorage.setItem(PUBLIC_KEY,JSON.stringify(current));return true;}
 catch{return false;}
}
function cloned(value){return JSON.parse(JSON.stringify(value));}
function snapshot(book,key){
 const st=privateState();
 const meta=book.fields||{};
 return {dossier:meta.dossier??st?.reference??"",
   client:meta.client??[st?.owner?.firstName,st?.owner?.lastName].filter(Boolean).join(" "),
   date:meta.date??st?.visit?.studyDate??"",
   technician:meta.technician??"",
   commune:meta.commune??st?.parcel?.city??"",
   analyst:meta.analyst??"",
   ...(key==="Exemple"?cloned(EXAMPLE):book.sheets[key]||empty())};
}
function calculate(sheet){
 const D=n(sheet.diameter),P=n(sheet.depth),H=n(sheet.height),rate=n(sheet.calibration);
 const area=(D!==null&&D>0&&H!==null&&H>0)?Math.PI*(D/2)**2+2*Math.PI*(D/2)*H:null;
 const first=n(sheet.graduations?.[0]);
 const rows=TIMES.map((minutes,i)=>{
   const g=n(sheet.graduations?.[i]);
   const vol=i>0&&first!==null&&g!==null&&rate!==null&&rate>0?(first-g)*rate:null;
   const valid=vol!==null&&vol>=0&&area!==null;
   const k=valid?60000*vol/(area*minutes):null;
   return {minutes,graduation:g,volume:valid?vol:null,k,ms:k===null?null:k/3600000};
 });
 const values=rows.slice(1).map(x=>x.k).filter(x=>x!==null);
 const mean=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 const graphicalSlope=n(sheet.slope);
 const graphical=area!==null&&graphicalSlope!==null&&graphicalSlope>=0?graphicalSlope*60000/area:null;
 const hasNegative=rows.some((r,i)=>i>0&&r.graduation!==null&&first!==null&&r.graduation>first);
 return {area,rows,mean,meanMs:mean===null?null:mean/3600000,graphical,graphicalMs:graphical===null?null:graphical/3600000,hasNegative,
   complete:rows.slice(1).every(x=>x.k!==null)};
}
function linkPrivate(st,book){
 if(!st||!Array.isArray(st.porchets))return;
 const tab=book.active;
 if(!/^KP[1-4]$/.test(tab))return;
 const s=book.sheets[tab],computed=calculate(s);
 const hasInputs=s&&[s.diameter,s.height,s.graduations?.[0],...s.graduations?.slice(1)||[]].some(v=>String(v||"").trim()!=="");
 if(!hasInputs)return;
 let p=st.porchets.find(x=>x.excelKey===tab);
 if(!p)p=st.porchets.find(x=>x.label===tab.replace("P","")&&!x.excelKey);
 if(!p){
   p={id:"porchet_excel_"+tab,label:tab.replace("P",""),readings:[],method:"constant_level",inputMode:"graduation",
     retention:"mean",depth:"",diameterCm:"",waterHeightCm:"",calibrationSource:"Tableur Porchet Fred — facteur saisi",
     protocolVersion:"PORCHET-EXCEL-FRED-V2"};
   st.porchets.push(p);
 }
 p.excelKey=tab;p.label=tab.replace("P","");
 p.diameterCm=n(s.diameter)===null?"":n(s.diameter)/10;
 p.depth=n(s.depth)===null?"":n(s.depth)/10;
 p.waterHeightCm=n(s.height)===null?"":n(s.height)/10;
 p.inputMode="graduation";p.method="constant_level";p.retention="mean";
 p.initialGraduation=n(s.graduations?.[0])??"";
 p.mlPerGraduation=n(s.calibration)??"";
 p.graphicalFlowMlMin=n(s.slope)??"";
 const former=Array.isArray(p.readings)?p.readings:[];
 p.readings=TIMES.slice(1).map((time,i)=>({
   id:former[i]?.id||"porchet_excel_"+tab+"_"+time,
   index:i+1,durationMin:time,graduation:n(s.graduations?.[i+1])??"",
   volumeMl:"",excluded:false,notes:"",startLevelCm:"",endLevelCm:"",waterLevelCm:""
 }));
 p.calculatedK=computed.mean??"";
 p.retainedK=computed.mean??"";
 p.permeability=computed.mean??"";
 p.graphicalK=computed.graphical??"";
 p.stability="Calcul Excel indicatif — validation requise";
 p.interpretation="K moyen calculé avec la formule du fichier Excel fourni par Fred. Validation professionnelle requise.";
}
function field(name,label,value,opts={}){
 const readonly=opts.readonly||false;
 return '<label class="px-field '+(opts.wide?"px-wide":"")+'"><span>'+esc(label)+'</span>'+
   '<input class="px-input '+(readonly?"px-readonly":"px-edit")+'" type="text" inputmode="'+(opts.numeric?"decimal":"text")+'" '+
   'data-px-field="'+esc(name)+'" value="'+esc(value)+'" '+(readonly?"readonly":"")+
   (opts.placeholder?' placeholder="'+esc(opts.placeholder)+'"':"")+'></label>';
}
function shell(book,key){
 const demo=key==="Exemple";
 const s=snapshot(book,key),r=calculate(s);
 const meta=(key==="Exemple"?{}:book.fields||{});
 const metaValue=(f,fall)=>demo?EXAMPLE[f]||fall:meta[f]??fall;
 const title="Rapport d’essai de perméabilité de type Porchet";
 const inputs=TIMES.map((t,i)=>{
   const out=r.rows[i];
   return '<tr class="'+(i===0?"px-initial":"")+'"><td class="px-time">'+t+'</td>'+
     '<td><input aria-label="Graduation à '+t+' minute'+(t>1?"s":"")+'" class="px-input '+(demo?"px-readonly":"px-edit")+
     '" type="text" inputmode="decimal" data-px-grad="'+i+'" value="'+esc(s.graduations?.[i]||"")+'" '+(demo?"readonly":"")+'></td>'+
     '<td>'+format(out.volume,3)+'</td><td>'+format(out.k,3)+'</td><td>'+fmtTiny(out.ms)+'</td></tr>';
 }).join("");
 const nav=KEYS.map(k=>'<button type="button" class="px-tab '+(k===key?"active":"")+'" data-px-tab="'+k+'">'+k+'</button>').join("");
 const message=r.hasNegative?'Une graduation est supérieure à la graduation initiale. Vérifier la saisie.':
   !r.complete&&key!=="Exemple"?'Compléter les cases jaunes pour obtenir le résultat.':
   'Résultat indicatif calculé automatiquement — validation professionnelle obligatoire.';
 const graph=chart(r.rows);
 return '<div class="px-wrapper">'+
   '<div class="px-tabs">'+nav+'</div>'+
   '<div class="px-paper"><div class="px-top"><h1>'+title+'</h1><span class="px-note">Seules les cases jaunes sont à remplir</span></div>'+
   '<div class="px-meta">'+
     field("dossier","Dossier",metaValue("dossier",privateState()?.reference||""),{readonly:demo})+
     field("client","Client",metaValue("client",[privateState()?.owner?.firstName,privateState()?.owner?.lastName].filter(Boolean).join(" ")),{readonly:demo})+
     field("date","Date",metaValue("date",privateState()?.visit?.studyDate||""),{readonly:demo})+
     field("technician","Technicien",metaValue("technician",""),{readonly:demo})+
     field("commune","Commune",metaValue("commune",privateState()?.parcel?.city||""),{readonly:demo})+
     field("analyst","Dépouillement",metaValue("analyst",""),{readonly:demo})+
   '</div>'+
   '<div class="px-group"><h2>Dimensions de l’essai</h2><div class="px-metrics">'+
   field("diameter","D (mm)",s.diameter,{numeric:true,readonly:demo})+
   field("depth","P (mm)",s.depth,{numeric:true,readonly:demo})+
   field("height","H (mm)",s.height,{numeric:true,readonly:demo})+
   '<div class="px-output"><span>S (mm²)</span><strong data-px-area>'+format(r.area,2)+'</strong></div>'+
   field("ref","Référence",s.ref||key,{readonly:demo})+
   '</div></div>'+
   '<div class="px-group"><h2>Relevés de graduation</h2>'+
   '<div class="px-table-scroll"><table class="px-table"><thead><tr><th>T (min)</th><th>Graduation</th><th>V (ml)</th><th>K (mm/h)</th><th>K (m/s)</th></tr></thead><tbody>'+inputs+
   '<tr class="px-total"><th colspan="3">Retenu (moyenne des K)</th><td data-px-mean>'+format(r.mean,3)+'</td><td>'+fmtTiny(r.meanMs)+'</td></tr></tbody></table></div></div>'+
   '<div class="px-secondary">'+
     field("soil","Nature du sol",s.soil,{wide:true,readonly:demo})+
     field("calibration","Graduation de 1 mm = … ml",s.calibration,{numeric:true,readonly:demo})+
   '</div>'+
   '<div class="px-graph-grid"><div class="px-group"><h2>Méthode graphique</h2>'+graph+
   '<div class="px-graph-results">'+
     field("slope","a (ml/min)",s.slope,{numeric:true,readonly:demo})+
     '<div class="px-output"><span>K (mm/h)</span><strong>'+format(r.graphical,3)+'</strong></div>'+
     '<div class="px-output"><span>K (m/s)</span><strong>'+fmtTiny(r.graphicalMs)+'</strong></div>'+
   '</div></div>'+
   '<div class="px-result"><span>K retenu (moyenne)</span><strong>'+format(r.mean,2)+' <small>mm/h</small></strong><span>'+fmtTiny(r.meanMs)+' m/s</span>'+
     '<p>Calcul selon le tableur fourni par Fred. Résultat à vérifier avant utilisation professionnelle.</p></div></div>'+
   '<div class="px-bottom"><span class="px-warning" role="status">'+esc(message)+'</span><span data-px-save role="status">'+(demo?"Exemple du classeur — lecture seule":"✓ Enregistrement automatique")+'</span></div>'+
   '</div></div>';
}
function chart(rows){
 const points=rows.filter(r=>r.volume!==null);
 if(points.length===0)return '<div class="px-chart-empty">La courbe apparaît dès que les graduations sont renseignées.</div>';
 const maxX=30,maxY=Math.max(1,...points.map(p=>p.volume))*1.15;
 const plot=p=>[50+p.minutes/maxX*560,235-p.volume/maxY*195];
 const line=points.map((p,i)=>(i?"L":"M")+plot(p).map(x=>x.toFixed(1)).join(",")).join(" ");
 const dots=points.map(p=>{const [x,y]=plot(p);return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="#1674dc"/>';}).join("");
 const horizontal=[0,0.25,0.5,0.75,1].map(v=>{const y=235-195*v;return '<line x1="50" x2="610" y1="'+y+'" y2="'+y+'" stroke="#e4ecf5"/><text x="44" y="'+(y+4)+'" text-anchor="end" fill="#6f8198" font-size="11">'+format(maxY*v,0)+'</text>'}).join("");
 const xLabels=[0,5,10,15,20,25,30].map(x=>'<text x="'+(50+x/30*560)+'" y="254" text-anchor="middle" fill="#6f8198" font-size="11">'+x+'</text>').join("");
 return '<div class="px-chart"><svg viewBox="0 0 650 287" role="img" aria-label="Méthode graphique : volume infiltré (ml) selon le temps (min)">'+
   horizontal+'<path d="'+line+'" fill="none" stroke="#1575e2" stroke-width="3" stroke-linejoin="round"/>'+dots+xLabels+
   '<text x="330" y="280" fill="#566d8c" text-anchor="middle" font-size="12">Temps (min)</text>'+
   '<text x="13" y="22" fill="#566d8c" font-size="11">Volume (ml)</text></svg></div>';
}
let currentSection=null,updating=false,scheduled=false;
function refresh(){
 if(updating)return;
 const section=document.getElementById("porchet");
 if(!section||!section.classList.contains("active"))return;
 if(section===currentSection&&section.dataset.pxExcelDone==="1")return;
 const book=getBook();
 if(!KEYS.includes(book.active))book.active="KP1";
 updating=true;
 section.dataset.pxExcelDone="1";currentSection=section;
 section.innerHTML=shell(book,book.active);
 updating=false;
}
function draw(){
 const section=document.getElementById("porchet");
 if(!section||!section.classList.contains("active"))return;
 const book=getBook();
 section.dataset.pxExcelDone="1";
 section.innerHTML=shell(book,book.active);
 currentSection=section;
}
function applyInput(input){
 const section=input.closest("#porchet");if(!section)return;
 const book=getBook(),key=book.active;
 if(key==="Exemple")return;
 if(!book.sheets[key])book.sheets[key]=empty();
 const gradIndex=input.dataset.pxGrad;
 const field=input.dataset.pxField;
 if(gradIndex!==undefined){book.sheets[key].graduations[Number(gradIndex)]=input.value;}
 else if(field){
   if(["dossier","client","date","technician","commune","analyst"].includes(field)){
     book.fields=book.fields||{};book.fields[field]=input.value;
   }else book.sheets[key][field]=input.value;
 }
 const y=window.scrollY,focusKey=field?"[data-px-field='"+field+"']":"[data-px-grad='"+gradIndex+"']";
 const selection={start:input.selectionStart,end:input.selectionEnd};
 const ok=writeBook(book);
 draw();
 const after=$(focusKey,section);
 if(after){after.focus({preventScroll:true});try{after.setSelectionRange(selection.start,selection.end)}catch{}}
 const status=$("[data-px-save]",section);
 if(status)status.textContent=ok?"✓ Enregistré automatiquement":"⚠ Impossible d’enregistrer sur cet appareil";
 if(Math.abs(window.scrollY-y)>8)window.scrollTo({top:y});
}
document.addEventListener("input",event=>{
 const t=event.target;
 if(t instanceof HTMLInputElement&&t.closest("#porchet")&&(t.dataset.pxField||t.dataset.pxGrad!==undefined)){
   event.stopImmediatePropagation();applyInput(t);
 }
},true);
document.addEventListener("click",event=>{
 const t=event.target.closest("[data-px-tab]");
 if(!t)return;
 event.stopImmediatePropagation();event.preventDefault();
 const book=getBook();
 if(!KEYS.includes(t.dataset.pxTab))return;
 book.active=t.dataset.pxTab;
 writeBook(book);
 draw();
},true);
const observer=new MutationObserver(()=>{
 if(scheduled)return;
 scheduled=true;
 queueMicrotask(()=>{scheduled=false;refresh()});
});
function start(){
 const root=document.getElementById("app");
 if(!root)return;
 observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
 refresh();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
window.ANCPorchetExcel={calculate,example:EXAMPLE,times:TIMES.slice(),render:draw,resetPublic:()=>{
  try{localStorage.removeItem(PUBLIC_KEY)}catch{}
}};
})();