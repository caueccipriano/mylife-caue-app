/* Editalume: searchable public snapshot of an incomplete PNCP sample.
No tracking, user account, or submission. Official documents always prevail. */
(function() {
"use strict";
const $ = id => document.getElementById(id);
const fmt=new Intl.NumberFormat("pt-BR");
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const dt=new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"});
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const node=(tag,cls,txt)=>{let el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el;};
let data=[],found=[],visible=12,ready=false;
function group(record,selected){
 const t=norm(record.object);
 if(selected==="all")return true;
 if(selected==="focus")return !!record.sector_focus||(!("sector_focus" in record)&&Number(record.relevance)>0);
 if(selected==="cleaning")return /limpeza|asseio|higieniz|conserva|dedetiza/.test(t);
 if(selected==="maintenance")return /manutenc|predial|reforma|facilities/.test(t);
 if(selected==="hvac")return /climatiz|ar condicionado|refriger/.test(t);
 if(selected==="electrical")return /eletric|hidraul|instalac/.test(t);
 if(selected==="landscaping")return /jardinag|paisagis|poda/.test(t);
 return false;
}
function resetChildren(el){el.replaceChildren();}
function card(record){
 const link=new URL(record.source_url);
 if(link.protocol!=="https:"||link.hostname!=="pncp.gov.br"||!link.pathname.startsWith("/app/editais/"))return null;
 const el=node("article","result-card"),left=node("div","card-main"),aside=node("aside","card-aside");
 const tags=node("div","result-top");
 tags.append(node("span","tag",record.sector_focus?"SERVIÇOS · SELECIONADO":"SETOR GERAL"),
             node("span","tag gray",record.city+"/SP"));
 left.append(tags,node("h4",null,record.object),node("div","card-organ",record.organ||"Órgão não informado"));
 const metadata=node("div","card-metadata");
 function attr(label,value){const d=node("div");d.append(node("strong",null,label),node("span",null,value));metadata.append(d);}
 attr("Modalidade",record.modality||"Consultar na fonte");
 attr("Controle",record.id||"Não informado");left.append(metadata);
 const details=node("div");
 details.append(node("div","label","PRAZO INFORMADO"),node("div","value",dt.format(new Date(record.deadline))),
                node("div","label",record.estimated_value_brl>0?"Valor estimado · "+money.format(record.estimated_value_brl):"Valor não informado"));
 const a=node("a",null,"Conferir edital ↗");a.href=link.href;a.target="_blank";a.rel="noopener noreferrer";
 aside.append(details,a);el.append(left,aside);return el;
}
function search(){
 const q=norm($("q").value).trim(),seg=$("segment").value,city=$("city").value,
 mod=$("modality").value,days=$("deadline").value,min=Math.max(0,Number($("minValue").value)||0);
 const now=Date.now(),until=days==="all"?Infinity:now+Number(days)*86400000;
 let arr=data.filter(r=>{
  let end=Date.parse(r.deadline);
  return Number.isFinite(end)&&end>now&&end<=until&&group(r,seg)&&(!city||r.city===city)&&(!mod||r.modality===mod)&&
    (!min||(Number(r.estimated_value_brl)||0)>=min)&&
    (!q||norm([r.object,r.organ,r.city,r.modality,r.id].join(" ")).includes(q));
 });
 const sort=$("sort").value;
 arr.sort((a,b)=>sort==="value"?(Number(b.estimated_value_brl)||0)-(Number(a.estimated_value_brl)||0)||Date.parse(a.deadline)-Date.parse(b.deadline):
 sort==="relevance"?(Number(b.relevance)||0)-(Number(a.relevance)||0)||Date.parse(a.deadline)-Date.parse(b.deadline):Date.parse(a.deadline)-Date.parse(b.deadline));
 return arr;
}
function render(reset){
 if(!ready)return;if(reset)visible=12;found=search();resetChildren($("results"));
 const frag=document.createDocumentFragment();
 for(const item of found.slice(0,visible)){try{const c=card(item);if(c)frag.append(c);}catch(e){/* invalid PNCP link is safely ignored */}}
 $("results").append(frag);
 $("resultsCount").textContent=fmt.format(found.length)+(found.length===1?" oportunidade encontrada":" oportunidades encontradas");
 $("shown").textContent="Exibindo "+fmt.format(Math.min(visible,found.length))+" de "+fmt.format(found.length)+" oportunidades nesta amostra.";
 $("more").hidden=visible>=found.length;$("empty").hidden=found.length!==0;$("csv").disabled=found.length===0;
}
function csvSafe(value){
 let str=String(value??"").replace(/[\r\n]+/g," ").trim();
 if(/^[\s]*[=+\-@]/.test(str))str="'"+str;
 return '"'+str.replace(/"/g,'""')+'"';
}
$("csv").onclick=()=>{
 if(!found.length)return;
 const rows=[["Órgão","Objeto","Município","UF","Modalidade","Prazo informado","Valor BRL","Controle PNCP","Link oficial"]];
 for(const r of found)rows.push([r.organ,r.object,r.city,r.uf||"SP",r.modality,r.deadline,r.estimated_value_brl??"",r.id,r.source_url]);
 const blob=new Blob(["\uFEFF",rows.map(r=>r.map(csvSafe).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="editalume-oportunidades.csv";document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
};
$("filters").addEventListener("submit",e=>{e.preventDefault();render(true);$("resultsCount").scrollIntoView({behavior:"smooth",block:"center"});});
$("filters").addEventListener("reset",()=>setTimeout(()=>render(true),0));
for(const key of ["q","segment","city","modality","deadline","minValue"])$(key).addEventListener("input",()=>render(true));
$("sort").addEventListener("change",()=>render(false));
$("more").addEventListener("click",()=>{visible+=12;render(false);});
$("copyrightYear").textContent=new Date().getFullYear();
async function init(){
 try{
  let res=await fetch("./search-index.json?cache="+Date.now(),{cache:"no-store"});
  const indexed=res.ok;
  if(!indexed)res=await fetch("./opportunities.json?cache="+Date.now(),{cache:"no-store"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const doc=await res.json();
  if(!doc||!Array.isArray(doc.opportunities))throw Error("Formato inválido");
  const base=Array.isArray(doc.catalog)?doc.catalog:doc.opportunities;
  data=base.filter(r=>r&&typeof r.object==="string"&&typeof r.city==="string"&&typeof r.deadline==="string"&&
    typeof r.source_url==="string"&&/^https:\/\/pncp\.gov\.br\/app\/editais\//.test(r.source_url));
  for(const [key,values] of [["city",data.map(r=>r.city)],["modality",data.map(r=>r.modality).filter(Boolean)]]){
   let unique=[...new Set(values)].sort((a,b)=>a.localeCompare(b,"pt-BR"));
   for(const v of unique){let opt=node("option",null,v);opt.value=v;$(key).append(opt);}
  }
  const focus=data.filter(r=>r.sector_focus||(!("sector_focus" in r)&&Number(r.relevance)>0)).length;
  const metrics={metricCatalog:data.length,metricFocus:focus,metricScanned:Number(doc.records_examined_this_run??doc.records_examined)||0,heroCount:data.length,heroFocus:focus};
  for(const key in metrics)$(key).textContent=fmt.format(metrics[key]);
  const time=Date.parse(doc.generated_at),stale=!Number.isFinite(time)||Date.now()-time>36*3600000;
  const partial=indexed?!!doc.partial:doc.status==="partial";
  let msg=(stale?"⚠ Dados desatualizados. ":"")+(partial?"⚠ Coleta parcial ou versão reduzida. ":"")+
  (Number.isFinite(time)?"Última atualização: "+dt.format(new Date(time))+". ":"Data da coleta não verificada. ")+
  fmt.format(Number(doc.records_examined_this_run??doc.records_examined)||0)+" registros examinados nesta coleta · "+fmt.format(data.length)+" oportunidades nesta amostra. "+
  "Amostra parcial. Registros de coletas anteriores podem ter sido alterados ou cancelados; para a fonte integral consulte o PNCP.";
  if(doc.status==="awaiting_first_scan")msg="Primeira coleta ainda não concluída. Nenhum edital está confirmado.";
  $("notice").className="data-notice"+(stale||partial?" warning":"");$("notice").textContent=msg;
  ready=true;render(true);
 }catch(err){
  $("notice").className="data-notice error";
  $("notice").textContent="Não foi possível validar a base agora. Consulte diretamente o PNCP; dados antigos não serão apresentados como atuais.";
  $("resultsCount").textContent="Base temporariamente indisponível";$("shown").textContent="A coleta não foi confirmada.";$("empty").hidden=false;
 }
}
init();
})();
