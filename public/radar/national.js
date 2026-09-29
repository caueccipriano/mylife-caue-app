/* Editalume Brasil: public Supabase read-only national search. Publishable key is
   intentionally public; RLS and SQL grants prohibit client-side writes. */
(()=>{
"use strict";
const API="https://jhxhbgprjqppzfrjdfvj.supabase.co/rest/v1";
const KEY="sb_publishable_O85v7HRJg7br9kxUbvticw_NNO8jp4w";
const STATES={"AC":"Acre","AL":"Alagoas","AP":"Amapá","AM":"Amazonas","BA":"Bahia","CE":"Ceará","DF":"Distrito Federal","ES":"Espírito Santo","GO":"Goiás","MA":"Maranhão","MT":"Mato Grosso","MS":"Mato Grosso do Sul","MG":"Minas Gerais","PA":"Pará","PB":"Paraíba","PR":"Paraná","PE":"Pernambuco","PI":"Piauí","RJ":"Rio de Janeiro","RN":"Rio Grande do Norte","RS":"Rio Grande do Sul","RO":"Rondônia","RR":"Roraima","SC":"Santa Catarina","SP":"São Paulo","SE":"Sergipe","TO":"Tocantins"};
const $=id=>document.getElementById(id);
const PAGE_SIZE=12;
const fmt=new Intl.NumberFormat("pt-BR"),money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const dt=new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"});
const node=(tag,cls,txt)=>{let x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
const empty=el=>el.replaceChildren();
const knownStatus={not_started:"Aguardando coleta",complete_sample:"Amostra recebida",partial:"Cobertura parcial",rate_limited:"Consulta limitada",failed:"Falha recente"};
const state={coverage:[],items:[],total:0,offset:0,loading:false,request:null,firstLoad:true};
function official(row){
 const m=/^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(row?.pncp_id||"");
 if(!m||Number(m[2])<1)return null;
 return "https://pncp.gov.br/app/editais/"+m[1]+"/"+m[3]+"/"+Number(m[2]);
}
function formatDate(iso){const date=new Date(iso);return Number.isFinite(date.getTime())?dt.format(date):"Verificar no PNCP"}
function formatValue(n){return n!==null&&Number(n)>0?money.format(Number(n)):"Não informado"}
function renderCoverage(){
 const available=state.coverage.filter(c=>c.last_success_at&&["complete_sample","partial","rate_limited"].includes(c.status));
 const count=available.length;
 $("national-uf-count").textContent=fmt.format(count)+"/27";
 $("national-coverage-description").textContent=
   count===0?"Aguardando a primeira coleta validada. A pesquisa não inventa editais.":
   fmt.format(count)+" de 27 UFs com ao menos uma amostra recebida. As demais estão em implantação.";
 const wrap=$("national-state-grid");empty(wrap);
 for(const [uf,name] of Object.entries(STATES)){
  const current=state.coverage.find(x=>x.uf===uf);
  const available=!!(current?.last_success_at&&["complete_sample","partial","rate_limited"].includes(current.status));
  const item=node("button","national-state"+(available?" has-data":" pending")+
    ($("national-uf").value===uf?" active":""),uf);
  item.type="button";item.title=name+" — "+(knownStatus[current?.status]||"Aguardando coleta");
  item.setAttribute("aria-label",item.title);item.setAttribute("aria-pressed",String($("national-uf").value===uf));
  item.addEventListener("click",()=>{$("national-uf").value=uf;state.offset=0;renderCoverage();search();});
  wrap.append(item);
 }
}
function publicLink(row,label){
 const href=official(row);if(!href)return null;
 const a=node("a","national-source",label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a;
}
function renderCards(){
 const root=$("national-results");empty(root);
 for(const row of state.items){
  const href=official(row);if(!href||Date.parse(row.closing_at)<=Date.now())continue;
  const card=node("article","national-result-card");
  const main=node("div","national-result-main");
  const head=node("div","national-result-tags");
  head.append(node("span","national-pill",row.uf+" · "+(row.municipality||"Município não identificado")),
   node("span","national-pill muted",row.sector_focus?"Serviços monitorados":"Setor geral"));
  const title=node("h3",null,row.title);
  const agency=node("p","national-agency",row.agency||"Órgão não informado");
  const metadata=node("div","national-result-meta");
  metadata.append(node("span",null,row.modality||"Modalidade: consultar PNCP"),
   node("span",null,"Último registro: "+formatDate(row.last_observed_at)));
  main.append(head,title,agency,metadata);
  const side=node("div","national-result-side");
  side.append(node("span","national-label","PRAZO INFORMADO"),
    node("strong","national-date",formatDate(row.closing_at)),
    node("span","national-label","VALOR ESTIMADO"),
    node("strong","national-money",formatValue(row.estimated_value_brl)));
  const link=publicLink(row,"Ver edital no PNCP ↗");if(link)side.append(link);
  card.append(main,side);root.append(card);
 }
 $("national-result-count").textContent=fmt.format(state.total)+(state.total===1?" edital encontrado":" editais encontrados");
 $("national-page-indicator").textContent="Exibindo "+fmt.format(state.items.length?state.offset+1:0)+"–"+fmt.format(Math.min(state.total,state.offset+state.items.length))+" de "+fmt.format(state.total)+" registros. Confirme os prazos no PNCP.";
 $("national-prev").hidden=state.offset===0;
 $("national-next").hidden=state.items.length<PAGE_SIZE||state.offset+state.items.length>=state.total;
 $("national-download").disabled=!state.items.length;
 const uf=$("national-uf").value;
 $("national-empty").hidden=state.items.length>0;
 $("national-empty-title").textContent=uf&&!(state.coverage.find(x=>x.uf===uf)?.last_success_at)?"Coleta ainda não concluída para "+STATES[uf]:"Nenhum registro neste filtro";
 $("national-empty-description").textContent=uf&&!(state.coverage.find(x=>x.uf===uf)?.last_success_at)?
  "Este estado já está configurado, mas ainda não há amostra validada. Consulte diretamente o PNCP enquanto expandimos a cobertura.":
  "Experimente ampliar os filtros. A base é amostral e a situação do edital pode mudar.";
}
function args(){
 const focus=$("national-focus").value;
 const days=$("national-deadline").value;
 const amount=$("national-min").value;
 return {p_q:$("national-q").value.trim().slice(0,120)||null,p_uf:$("national-uf").value||null,
  p_city:$("national-city").value.trim().slice(0,90)||null,
  p_focus:focus===""?null:focus==="true",
  p_days:days?Number(days):null,p_min_value:amount?Math.max(0,Number(amount)):null,
  p_sort:$("national-sort").value,p_limit:PAGE_SIZE,p_offset:state.offset};
}
async function search(){
 if(state.request)state.request.abort();
 const ctrl=new AbortController();state.request=ctrl;state.loading=true;
 $("national-submit").disabled=true;$("national-status").textContent="Consultando base nacional...";
 $("national-result-count").textContent="Buscando...";
 try{
  const response=await fetch(API+"/rpc/editalume_search",{method:"POST",headers:{"apikey":KEY,"Content-Type":"application/json"},body:JSON.stringify(args()),signal:ctrl.signal,cache:"no-store"});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const rows=await response.json();if(!Array.isArray(rows))throw Error("Resposta inesperada");
  if(state.request!==ctrl)return;
  state.items=rows.filter(r=>official(r));state.total=Number(rows[0]?.total_count)||0;
  $("national-status").textContent="Base de dados independente conectada. Cobertura nacional em expansão; resultados não são uma lista exaustiva.";
  renderCards();
 }catch(err){
  if(err.name==="AbortError")return;
  if(state.request!==ctrl)return;
  empty($("national-results"));state.items=[];state.total=0;
  $("national-result-count").textContent="Conexão indisponível";
  $("national-status").textContent="Não foi possível consultar o Supabase agora. O acervo paulista abaixo permanece disponível; para dados completos use o PNCP.";
  $("national-page-indicator").textContent="";
  $("national-next").hidden=true;$("national-prev").hidden=true;$("national-download").disabled=true;
  $("national-empty").hidden=false;$("national-empty-title").textContent="Falha temporária de conexão";
  $("national-empty-description").textContent="Tente novamente ou consulte a fonte oficial.";
 }finally{if(state.request===ctrl){state.loading=false;$("national-submit").disabled=false;}}
}
let debounce=null;
function filtersChanged(){state.offset=0;clearTimeout(debounce);debounce=setTimeout(()=>{renderCoverage();search()},300)}
function csvCell(v){let s=String(v??"").replace(/[\r\n]/g," ").trim();if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function downloadPage(){
 if(!state.items.length)return;
 const rows=[["Controle PNCP","Título","Órgão","Município","UF","Modalidade","Prazo informado","Valor estimado BRL","Último registro","Edital oficial"]];
 for(const r of state.items){const url=official(r);if(!url)continue;
  rows.push([r.pncp_id,r.title,r.agency,r.municipality,r.uf,r.modality,r.closing_at,r.estimated_value_brl??"",r.last_observed_at,url]);}
 const blob=new Blob(["\ufeff",rows.map(row=>row.map(csvCell).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="editalume-brasil-pagina.csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function loadCoverage(){
 try{
  const response=await fetch(API+"/editalume_uf_coverage?select=uf,status,last_success_at,records_examined&order=uf.asc",
   {headers:{"apikey":KEY},cache:"no-store"});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.length!==27)throw new Error("Coverage missing");
  state.coverage=rows;renderCoverage();
 }catch(_err){
  $("national-coverage-description").textContent="Não foi possível verificar a cobertura agora. Não confunda estados configurados com estados já coletados.";
  renderCoverage();
 }
}
function init(){
 if(!$("national-form"))return;
 const picker=$("national-uf");for(const [uf,name] of Object.entries(STATES)){const o=node("option",null,name+" ("+uf+")");o.value=uf;picker.append(o)}
 $("national-form").addEventListener("submit",event=>{event.preventDefault();state.offset=0;clearTimeout(debounce);renderCoverage();search()});
 for(const id of ["national-q","national-city","national-uf","national-focus","national-deadline","national-min","national-sort"]){
  $(id).addEventListener(id==="national-q"||id==="national-city"||id==="national-min"?"input":"change",filtersChanged);
 }
 $("national-reset").addEventListener("click",()=>{$("national-form").reset();state.offset=0;renderCoverage();search()});
 $("national-next").addEventListener("click",()=>{state.offset+=PAGE_SIZE;search();$("national-result-count").scrollIntoView({behavior:"smooth",block:"center"})});
 $("national-prev").addEventListener("click",()=>{state.offset=Math.max(0,state.offset-PAGE_SIZE);search();$("national-result-count").scrollIntoView({behavior:"smooth",block:"center"})});
 $("national-download").addEventListener("click",downloadPage);
 renderCoverage();loadCoverage();search();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
