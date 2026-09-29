/**
 * Editalume Asaas SANDBOX-only webhook intake.
 *
 * verify_jwt=false: Asaas does not send a Supabase JWT. Authenticate each
 * request via Asaas's dedicated asaas-access-token and an independent secret.
 * Never accept an Asaas API key as a webhook token. Never grant Premium here:
 * this ledger only records idempotent authenticated events for later server-side
 * reconciliation with the Asaas API.
 */
const ALLOWED=new Set([
 "PAYMENT_CREATED","PAYMENT_UPDATED","PAYMENT_CONFIRMED","PAYMENT_RECEIVED",
 "PAYMENT_OVERDUE","PAYMENT_DELETED","PAYMENT_REFUNDED",
 "SUBSCRIPTION_CREATED","SUBSCRIPTION_UPDATED","SUBSCRIPTION_INACTIVATED",
 "SUBSCRIPTION_DELETED"
]);
const enc=new TextEncoder();
const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const err=(code,status)=>json({ok:false,code},status);
const safe=(value,max)=>typeof value==="string"&&value.length<=max&&value.length>0?value:null;
async function digest(s){return new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(s)));}
async function tokenMatches(got,secret){
 if(typeof got!=="string"||got.length<32||got.length>255||typeof secret!=="string"||secret.length<32)return false;
 const [a,b]=await Promise.all([digest(got),digest(secret)]);
 let different=0;for(let i=0;i<a.length;i++)different|=a[i]^b[i];
 return different===0;
}
function admin(){
 const url=Deno.env.get("SUPABASE_URL");
 let key="";
 try{key=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch(_){}
 key||=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!key)throw Error("Private database credentials missing");
 const headers={"apikey":key,"Content-Type":"application/json",
   "Prefer":"resolution=ignore-duplicates,return=minimal"};
 if(key.startsWith("eyJ"))headers.Authorization="Bearer "+key;
 return {url,headers};
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return err("method_not_allowed",405);
 const secret=Deno.env.get("ASAAS_SANDBOX_WEBHOOK_TOKEN");
 if(!secret||secret.length<32||secret.length>255)return err("webhook_not_configured",503);
 const sent=req.headers.get("asaas-access-token");
 if(!await tokenMatches(sent,secret))return err("unauthorized",401);
 const n=Number(req.headers.get("content-length")||"0");
 if(!Number.isFinite(n)||n>16384)return err("payload_too_large",413);
 let raw;
 try{
  const body=await req.text();
  if(enc.encode(body).length>16384)return err("payload_too_large",413);
  raw=JSON.parse(body);
 }catch(_){return err("invalid_json",400);}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return err("invalid_payload",400);
 const id=safe(raw.id,150),event=safe(raw.event,90);
 if(!id||id.length<5||!event||event.length<5||!/^[-_&.a-zA-Z0-9]+$/.test(id)||!/^[A-Z_]+$/.test(event))return err("invalid_event",400);
 if(!ALLOWED.has(event))return json({ok:true,ignored:true},200);
 const payment=raw.payment&&typeof raw.payment==="object"&&!Array.isArray(raw.payment)?raw.payment:null;
 const subscription=raw.subscription&&typeof raw.subscription==="object"&&!Array.isArray(raw.subscription)?raw.subscription:null;
 const row={
   environment:"sandbox",event_id:id,event_type:event,
   payment_id:safe(payment?.id,120),
   subscription_id:safe(subscription?.id,120)||safe(payment?.subscription,120),
   external_reference:safe(payment?.externalReference,180)||safe(subscription?.externalReference,180),
   payment_status:safe(payment?.status,60),
   source_verified:true
 };
 try{
  const svc=admin();
  const response=await fetch(svc.url+"/rest/v1/editalume_asaas_events?on_conflict=environment,event_id",{
   method:"POST",headers:svc.headers,body:JSON.stringify(row)
  });
  if(!response.ok)return err("persist_failed",503);
  // No business rules here. A payment notification alone cannot activate a plan.
  return json({ok:true},200);
 }catch(_){return err("backend_unavailable",503);}
});
