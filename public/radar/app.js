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
// Do not show or export a credible-looking PNCP URL for the wrong procurement ID.
function officialNotice(record){
 if(!record||typeof record.id!=="string"||typeof record.source_url!=="string")return null;
 const id=/^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(record.id);
 if(!id)return null;
 const serial=Number(id[2]);
 if(!Number.isSafeInteger(serial)||serial<1)return null;
 const exact="https://pncp.gov.br/app/editais/"+id[1]+"/"+id[3]+"/"+serial;
 if(record.source_url!==exact&&record.source_url!==exact+"/")return null;
 try{
  const u=new URL(record.source_url);
  if(u.origin!=="https://pncp.gov.br"||u.username||u.password||u.search||u.hash)return null;
  return exact;
 }catch(_){return null;}
}

let data=[],found=[],visible=12,ready=false,lastIndexedAt=null;
let sourceMode="snapshot",loadedTotal=null,loadTruncated=false,coverage=[];
const ufNames={AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
for(const uf of Object.keys(ufNames).sort()){const opt=node("option",null,uf+" · "+ufNames[uf]);opt.value=uf;$("uf").append(opt);}
const liveCfg=window.EDITALUME_PUBLIC_CONFIG||null;
function officialFromId(id){
 const m=typeof id==="string"&&/^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(id);
 return m?"https://pncp.gov.br/app/editais/"+m[1]+"/"+m[3]+"/"+Number(m[2]):null;
}
function adaptRow(r){
 const url=officialFromId(r.pncp_id);
 if(!url||!ufNames[r.uf]||typeof r.title!=="string"||typeof r.municipality!=="string")return null;
 return {id:r.pncp_id,source_url:url,uf:r.uf,city:r.municipality,organ:r.agency,
 object:r.title,modality:r.modality,estimated_value_brl:r.estimated_value_brl,
 deadline:r.closing_at,sector_focus:r.sector_focus,relevance:r.relevance,
 first_seen_at:r.first_observed_at,last_seen_at:r.last_observed_at};
}
function timeoutFetch(url,headers){
 // Fail over to the last verified static snapshot rather than spin forever.
 return fetch(url,{headers,cache:"no-store",signal:AbortSignal.timeout(12000)});
}
async function loadLive(selectedUF){
 if(!liveCfg||!/^https:\/\/[-\w.]+\.supabase\.co$/.test(liveCfg.supabaseUrl))return null;
 const key=liveCfg.publishableKey;
 if(typeof key!=="string"||!key.startsWith("sb_publishable_"))return null;
 const headers={apikey:key,Accept:"application/json",Prefer:"count=exact"};
 const root=liveCfg.supabaseUrl+"/rest/v1/";
 let stateList=[];
 try{
   const states=await timeoutFetch(root+"editalume_uf_coverage?select=uf,status,last_success_at,records_examined&order=uf.asc",headers);
   if(states.ok){const response=await states.json();if(Array.isArray(response))stateList=response;}
 }catch(_){/* Opportunity query is independent of the coverage endpoint. */}
 const limit=Math.min(5000,Math.max(1000,Number(liveCfg.maxRecords)||5000)),pageSize=1000;
 let opportunities=[],total=null;
 for(let offset=0;offset<limit;offset+=pageSize){
   const qs=new URLSearchParams({
     select:"pncp_id,uf,municipality,agency,title,modality,estimated_value_brl,closing_at,sector_focus,relevance,first_observed_at,last_observed_at",
     closing_at:"gt."+new Date().toISOString(),order:"closing_at.asc",limit:String(Math.min(pageSize,limit-offset)),offset:String(offset)
   });
   if(selectedUF)qs.set("uf","eq."+selectedUF);
   const result=await timeoutFetch(root+"editalume_opportunities?"+qs,headers);
   if(!result.ok)throw new Error("Catalog read unavailable");
   const batch=await result.json();
   if(!Array.isArray(batch))throw new Error("Invalid catalog response");
   opportunities.push(...batch.map(adaptRow).filter(Boolean));
   const match=/\/(\d+)$/.exec(result.headers.get("content-range")||"");
   if(match)total=Number(match[1]);
   if(batch.length<Math.min(pageSize,limit-offset))break;
 }
 coverage=stateList;
 loadedTotal=total??opportunities.length;
 loadTruncated=loadedTotal>opportunities.length;
 return opportunities;
}
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
 const link=officialNotice(record);
 if(!link)return null;
 const el=node("article","result-card"),left=node("div","card-main"),aside=node("aside","card-aside");
 const tags=node("div","result-top");
 const unreconfirmed=Boolean(lastIndexedAt && record.last_seen_at!==lastIndexedAt);
 tags.append(node("span","tag",record.sector_focus?"SERVIÇOS · SELECIONADO":"SETOR GERAL"),
             node("span","tag gray",record.city+"/"+record.uf));
 if(lastIndexedAt && record.last_seen_at===lastIndexedAt)tags.append(node("span","tag observed-tag","VISTO NA COLETA"));
 if(unreconfirmed)tags.append(node("span","tag stale-tag","NÃO RECONFIRMADO"));
 left.append(tags,node("h4",null,record.object),node("div","card-organ",record.organ||"Órgão não informado"));
 const metadata=node("div","card-metadata");
 function attr(label,value){const d=node("div");d.append(node("strong",null,label),node("span",null,value));metadata.append(d);}
 attr("Modalidade",record.modality||"Consultar na fonte");
 attr("Controle",record.id||"Não informado");left.append(metadata);
 const details=node("div","deadline-details");
 const hoursLeft=(Date.parse(record.deadline)-Date.now())/3600000;
 if(hoursLeft<=72){
  details.append(node("div","deadline-alert","PRAZO PRÓXIMO · CONFIRME NO PNCP"));
 }
 details.append(node("div","label","PRAZO INFORMADO"),node("div","value",dt.format(new Date(record.deadline))),
                node("div","label","VALOR ESTIMADO"),
                node("div","amount",record.estimated_value_brl>0?money.format(record.estimated_value_brl):"Não informado"));
 const a=node("a",null,"Conferir edital ↗");a.href=link;a.target="_blank";a.rel="noopener noreferrer";
 aside.append(details,a);el.append(left,aside);return el;
}
function search(){
 const q=norm($("q").value).trim(),seg=$("segment").value,city=$("city").value,uf=$("uf").value,
 mod=$("modality").value,days=$("deadline").value,min=Math.max(0,Number($("minValue").value)||0);
 const now=Date.now(),until=days==="all"?Infinity:now+Number(days)*86400000;
 let arr=data.filter(r=>{
  let end=Date.parse(r.deadline);
  return Number.isFinite(end)&&end>now&&end<=until&&
    (!$("observedOnly").checked || (!!lastIndexedAt && r.last_seen_at===lastIndexedAt))&&
    group(r,seg)&&(!uf||r.uf===uf)&&(!city||r.city===city)&&(!mod||r.modality===mod)&&
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
 $("shown").textContent="Exibindo "+fmt.format(Math.min(visible,found.length))+" de "+fmt.format(found.length)+" registros carregados."+(loadTruncated?" O banco possui mais registros: limite temporário da pesquisa ("+fmt.format(data.length)+").":"");
 if(!found.length&&sourceMode==="live"&&$("uf").value){
  const state=coverage.find(c=>c.uf===$("uf").value);
  $("empty").querySelector("p").textContent=state?.status==="not_started"?
    "A coleta ainda não foi iniciada neste estado. A cobertura nacional está sendo implantada. Confira o PNCP para a pesquisa completa.":
    "Nenhum edital com prazo futuro foi importado para este estado. Isso não significa que não existam oportunidades no PNCP.";
 }
 $("more").hidden=visible>=found.length;$("empty").hidden=found.length!==0;$("csv").disabled=found.length===0;
 if(!$("alertPreview").hidden)updatePreview();
}
function updatePreview(){
 const summary=$("previewSummary"),list=$("previewItems");
 list.replaceChildren();
 summary.textContent="Pesquisa atual: "+fmt.format(found.length)+(found.length===1?" oportunidade compatível nesta amostra.":" oportunidades compatíveis nesta amostra.")+" Exibindo até três exemplos.";
 for(const record of found.slice(0,3)){
  const link=officialNotice(record);if(!link)continue;
  const wrapper=node("div","preview-item"),content=node("div");
  content.append(node("strong",null,record.object),node("span",null,record.city+"/"+record.uf+" · Encerramento informado: "+dt.format(new Date(record.deadline))));
  const a=node("a",null,"Abrir fonte ↗");a.href=link;a.target="_blank";a.rel="noopener noreferrer";
  wrapper.append(content,a);list.append(wrapper);
 }
 if(!found.length)list.append(node("p","preview-disclaimer","Nenhum resultado com os filtros atuais. O futuro serviço não garante a existência de novas oportunidades."));
}
function csvSafe(value){
 let str=String(value??"").replace(/[\r\n]+/g," ").trim();
 if(/^[\s]*[=+\-@]/.test(str))str="'"+str;
 return '"'+str.replace(/"/g,'""')+'"';
}
$("csv").onclick=()=>{
 if(!found.length)return;
 const rows=[["Órgão","Objeto","Município","UF","Modalidade","Prazo informado","Valor BRL","Controle PNCP","Link oficial"]];
 for(const r of found)rows.push([r.organ,r.object,r.city,r.uf||"",r.modality,r.deadline,r.estimated_value_brl??"",r.id,r.source_url]);
 const blob=new Blob(["\uFEFF",rows.map(r=>r.map(csvSafe).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="editalume-oportunidades.csv";document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
};
$("filters").addEventListener("submit",e=>{e.preventDefault();render(true);$("resultsCount").scrollIntoView({behavior:"smooth",block:"center"});});
$("filters").addEventListener("reset",()=>setTimeout(()=>{if(sourceMode==="live")init();else render(true);},0));
$("uf").addEventListener("change",()=>{ $("city").replaceChildren(node("option",null,"Todas as cidades"));$("city").firstChild.value="";
 $("modality").replaceChildren(node("option",null,"Todas as modalidades"));$("modality").firstChild.value="";
 if(sourceMode==="live")init();else render(true);
});
for(const key of ["q","segment","city","modality","deadline","minValue","observedOnly"])$(key).addEventListener("input",()=>render(true));
$("sort").addEventListener("change",()=>render(false));
$("more").addEventListener("click",()=>{visible+=12;render(false);});
$("previewAlert").addEventListener("click",()=>{
 $("alertPreview").hidden=false;$("previewAlert").setAttribute("aria-expanded","true");
 updatePreview();$("alertPreview").scrollIntoView({behavior:"smooth",block:"start"});
});
$("closePreview").addEventListener("click",()=>{
 $("alertPreview").hidden=true;$("previewAlert").setAttribute("aria-expanded","false");
 $("previewAlert").focus();
});
$("copyrightYear").textContent=new Date().getFullYear();
async function init(){
 try{
  let res=await fetch("./search-index.json?cache="+Date.now(),{cache:"no-store"});
  const indexed=res.ok;
  if(!indexed)res=await fetch("./opportunities.json?cache="+Date.now(),{cache:"no-store"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const doc=await res.json();
  if(!doc||!Array.isArray(doc.opportunities))throw Error("Formato inválido");
  lastIndexedAt=doc.generated_at||null;
  const base=Array.isArray(doc.catalog)?doc.catalog:doc.opportunities;
  data=base.filter(r=>r&&typeof r.object==="string"&&typeof r.city==="string"&&typeof r.deadline==="string"&&
    typeof r.source_url==="string"&&officialNotice(r));
  for(const [key,values] of [["city",data.map(r=>r.city)],["modality",data.map(r=>r.modality).filter(Boolean)]]){
   let unique=[...new Set(values)].sort((a,b)=>a.localeCompare(b,"pt-BR"));
   for(const v of unique){let opt=node("option",null,v);opt.value=v;$(key).append(opt);}
  }
  // The auxiliary sample has no per-record observation markers: never
  // present it as if each record was individually reconfirmed this run.
  if(!indexed||!lastIndexedAt||!data.some(r=>r.last_seen_at===lastIndexedAt)){
    $("observedOnly").checked=false;
    $("observedOnly").disabled=true;
    document.querySelector(".latest-toggle span").textContent="Reconfirmação individual indisponível nesta coleta";
  }
  const focus=data.filter(r=>r.sector_focus||(!("sector_focus" in r)&&Number(r.relevance)>0)).length;
  // The historical index can carry forward records no longer open today.
  const active=data.filter(r=>Number.isFinite(Date.parse(r.deadline))&&Date.parse(r.deadline)>Date.now());
  const activeFocus=active.filter(r=>r.sector_focus||(!("sector_focus" in r)&&Number(r.relevance)>0)).length;
  const scanned=Number(doc.sample_fallback?doc.verified_sample_records_examined:doc.records_examined_this_run??doc.records_examined)||0;
  const metrics={metricCatalog:active.length,metricFocus:activeFocus,metricScanned:scanned,heroCount:active.length,heroFocus:activeFocus};
  for(const key in metrics)$(key).textContent=fmt.format(metrics[key]);
  const time=Date.parse(doc.generated_at),stale=!Number.isFinite(time)||Date.now()-time>36*3600000;
  const partial=!!doc.rate_limited||(indexed?!!doc.partial:doc.status==="partial");
  let refreshFailed=false,refreshPartial=false,attemptedAt=null;
  try{
    const statusRes=await fetch("./refresh-status.json?cache="+Date.now(),{cache:"no-store"});
    if(statusRes.ok){const latest=await statusRes.json();
      const attemptMs=Date.parse(latest.attempted_at||"");
      const dataMs=Date.parse(doc.generated_at||"");
      if(latest.degraded && Number.isFinite(attemptMs) && (!Number.isFinite(dataMs)||attemptMs>=dataMs)){
         // "degraded" also covers a partial scan. Only failed runs deserve
         // the stronger failure label; partially updated data remains usable.
         refreshFailed=latest.sample_refresh==="failed"||latest.index_refresh==="failed";
         refreshPartial=latest.sample_refresh==="partial"||latest.index_refresh==="partial";
         attemptedAt=latest.attempted_at;
      }
    }
  }catch(_err){/* A missing status endpoint never disguises the data timestamp. */}
  const carried=Number(doc.carried_forward_unreconfirmed)||0;
  let msg=(stale?"⚠ Dados desatualizados. ":"")+(partial?"⚠ Coleta parcial ou versão reduzida. ":"")+
  (Number.isFinite(time)?"Última atualização: "+dt.format(new Date(time))+". ":"Data da coleta não verificada. ")+
  fmt.format(scanned)+(doc.sample_fallback?" registros examinados no recorte auxiliar":" registros examinados nesta coleta")+" · "+fmt.format(active.length)+" registros no catálogo ainda com prazo informado no futuro. "+
  "Amostra parcial. Registros de coletas anteriores podem ter sido alterados ou cancelados; para a fonte integral consulte o PNCP.";
  if(doc.sample_fallback)msg+="⚠ A consulta ampliada não respondeu; o índice foi parcialmente atualizado com a coleta auxiliar recente. ";
  if(doc.rate_limited)msg+="⚠ Limite temporário de consultas ao PNCP: esta coleta está incompleta e não reconfirma todo o catálogo. ";
  if(carried)msg+=fmt.format(carried)+" registros vieram de coletas anteriores sem nova confirmação. ";
  if(refreshPartial&&!partial)msg="⚠ A última coleta do PNCP foi parcial; nem todos os registros foram reconfirmados. "+msg;
  if(refreshFailed)msg="⚠ A última tentativa de atualização falhou"+(attemptedAt?" em "+dt.format(new Date(attemptedAt)):"")+". Abaixo estão os dados da última coleta disponível, não uma confirmação atual. "+msg;
  if(doc.status==="awaiting_first_scan")msg="Primeira coleta ainda não concluída. Nenhum edital está confirmado.";
  const statusTitle=refreshFailed?"Atualização falhou: consulte a origem":stale?"Base desatualizada: confirme os prazos":partial||refreshPartial?"Cobertura parcial nesta coleta":"Amostra atualizada";
  const statusHeader=node("strong","notice-heading",statusTitle);
  const statusBody=node("p","notice-description",msg);
  $("notice").className="data-notice"+(stale||partial||refreshPartial||refreshFailed?" warning":"");
  $("notice").replaceChildren(statusHeader,statusBody);
  ready=true;$("previewAlert").disabled=false;render(true);
 }catch(err){
  $("notice").className="data-notice error";
  $("notice").textContent="Não foi possível validar a base agora. Consulte diretamente o PNCP; dados antigos não serão apresentados como atuais.";
  $("resultsCount").textContent="Base temporariamente indisponível";$("shown").textContent="A coleta não foi confirmada.";$("empty").hidden=false;
 }
}
init();
})();
