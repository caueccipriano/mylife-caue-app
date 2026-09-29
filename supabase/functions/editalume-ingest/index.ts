/** Editalume national ingestion — only signed OIDC identities of our main GitHub
 * Actions workflow may write validated public PNCP records. No client secrets.
 * Deploy with verify_jwt=false because Github OIDC is verified with JOSE here. */
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";
const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="editalume-national-sync-v1";
const WORKFLOW="caueccipriano/mylife-caue-app/.github/workflows/radar-national.yml@refs/heads/main";
const STATES=new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
const jwks=createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
function failure(message:string,status:number){return Response.json({ok:false,error:message},{status,headers:{"Cache-Control":"no-store"}})}
function service(){
 const url=Deno.env.get("SUPABASE_URL");
 const keys=Deno.env.get("SUPABASE_SECRET_KEYS");
 let key:string|undefined;
 try{if(keys)key=JSON.parse(keys).default;}catch(_){/* legacy fallback */ }
 key ||= Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||undefined;
 if(!url||!key)throw Error("Backend configuration missing");
 const headers:Record<string,string>={"apikey":key,"Content-Type":"application/json"};
 if(key.startsWith("eyJ"))headers.Authorization="Bearer "+key;
 return {url,headers};
}
function validateBid(raw:any,uf:string,at:string){
 if(!raw||typeof raw!=="object"||Array.isArray(raw)||raw.uf!==uf)return null;
 const id=String(raw.id||"");
 const m=/^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(id);
 if(!m||!Number.isSafeInteger(Number(m[2]))||Number(m[2])<1)return null;
 const exact="https://pncp.gov.br/app/editais/"+m[1]+"/"+m[3]+"/"+Number(m[2]);
 if(raw.source_url!==exact&&raw.source_url!==exact+"/")return null;
 const municipality=String(raw.city||"").trim().slice(0,100);
 const agency=String(raw.organ||"").trim().slice(0,180);
 const title=String(raw.object||"").trim().slice(0,1200);
 const end=Date.parse(raw.deadline);
 const clock=Date.now();
 if(!municipality||!agency||title.length<8||!Number.isFinite(end)||end<clock-3600000||end>clock+180*86400000)return null;
 const value=raw.estimated_value_brl;
 const amount=(typeof value==="number"&&Number.isFinite(value)&&value>0&&value<1e15)?Math.round(value*100)/100:null;
 const first=Date.parse(raw.first_seen_at);
 const firstAt=Number.isFinite(first)&&first<=Date.parse(at)&&first>clock-2*365*86400000?new Date(first).toISOString():at;
 return {pncp_id:id,uf,municipality,agency,title,modality:String(raw.modality||"Verificar no PNCP").slice(0,120),
  estimated_value_brl:amount,closing_at:new Date(end).toISOString(),sector_focus:raw.sector_focus===true,
  relevance:Math.min(Math.max(Math.trunc(Number(raw.relevance)||0),0),100),
  first_observed_at:firstAt,last_observed_at:at};
}
async function supabaseFetch(url:string,headers:Record<string,string>,options:RequestInit){
 const response=await fetch(url,{...options,headers:{...headers,...(options.headers||{})}});
 if(!response.ok)throw Error("Supabase internal HTTP "+response.status);
 return response;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return failure("Method not allowed",405);
 const bearer=/^Bearer (\S+)$/.exec(req.headers.get("authorization")||"");
 if(!bearer)return failure("Github OIDC identity required",401);
 try{
  const {payload}=await jwtVerify(bearer[1],jwks,{issuer:ISSUER,audience:AUDIENCE,
   algorithms:["RS256"],clockTolerance:5});
  if(payload.repository!=="caueccipriano/mylife-caue-app"||String(payload.repository_id)!=="1376275303"||
     payload.ref!=="refs/heads/main"||payload.workflow_ref!==WORKFLOW||
     payload.event_name!=="push"&&payload.event_name!=="schedule"&&payload.event_name!=="workflow_dispatch")
   return failure("Workflow is not authorized",403);
 }catch(_){return failure("Github OIDC verification failed",401)}
 const length=Number(req.headers.get("content-length")||0);
 if(length>360000)return failure("Payload too large",413);
 let body:any;
 try{const raw=await req.text();if(raw.length>360000)return failure("Payload too large",413);body=JSON.parse(raw)}
 catch(_){return failure("Invalid payload",400)}
 if(!body||typeof body!=="object"||!STATES.has(body.uf)||!Array.isArray(body.opportunities)||
   body.opportunities.length>120||!["complete_sample","partial","rate_limited","failed"].includes(body.status))
    return failure("Invalid state report",400);
 const at=Date.parse(body.attempted_at);
 if(!Number.isFinite(at)||Math.abs(Date.now()-at)>45*60000)return failure("Invalid report timestamp",400);
 const pages=Number(body.pages_examined),records=Number(body.records_examined);
 if(!Number.isInteger(pages)||pages<0||pages>6||!Number.isInteger(records)||records<0||records>300||
   body.opportunities.length>records||body.status==="complete_sample"&&pages===0||
   body.status==="failed"&&pages>0||body.status==="rate_limited"&&pages>0)
   return failure("Inconsistent state report",400);
 const iso=new Date(at).toISOString();
 const bids=body.opportunities.map((item:any)=>validateBid(item,body.uf,iso));
 if(bids.some((v:any)=>!v))return failure("Invalid or unverified PNCP record",400);
 const deduped=[...new Map(bids.map((r:any)=>[r.pncp_id,r])).values()];
 let svc;
 try{svc=service()}catch(_){return failure("Sync backend is not configured",503)}
 try{
  if(deduped.length){
   // Preserve first observation timestamps on updates already stored.
   const ids=deduped.map((x:any)=>x.pncp_id);
   const filter="("+ids.map((x:string)=>'"'+x+'"').join(",")+")";
   const existing=await supabaseFetch(svc.url+"/rest/v1/editalume_opportunities?select=pncp_id,first_observed_at&pncp_id=in."+encodeURIComponent(filter),svc.headers,{method:"GET"});
   const firsts=new Map((await existing.json()).map((x:any)=>[x.pncp_id,x.first_observed_at]));
   for(const row of deduped as any[]){
    const first=firsts.get(row.pncp_id);if(first&&Date.parse(String(first))<=at)row.first_observed_at=first;
   }
   await supabaseFetch(svc.url+"/rest/v1/editalume_opportunities?on_conflict=pncp_id",svc.headers,{
     method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(deduped)});
  }
  const update:Record<string,unknown>={status:body.status,last_attempt_at:iso,
     last_http_status:Number.isInteger(body.last_http_status)&&body.last_http_status>=100&&body.last_http_status<=599?body.last_http_status:null,
     records_examined:records,pages_examined:pages,updated_at:iso};
  if(pages>0)update.last_success_at=iso;
  await supabaseFetch(svc.url+"/rest/v1/editalume_uf_coverage?uf=eq."+body.uf,svc.headers,
     {method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(update)});
  return Response.json({ok:true,uf:body.uf,accepted:deduped.length,status:body.status},{headers:{"Cache-Control":"no-store"}});
 }catch(_){return failure("National sync failed; previous records preserved",502)}
});
