/** Editalume Asaas SANDBOX webhook gate. It NEVER creates a charge, changes
 * entitlements, or accepts live payments. Header token + API read-back and
 * DB event idempotency are mandatory. No raw payer details are stored.
 * verify_jwt=false: Asaas cannot send Supabase JWT; the handler implements
 * a separate high-entropy webhook authentication token. */
function respond(status,body){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}})}
function constantTime(a,b){if(!a||!b||a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function service(){
 const url=Deno.env.get("SUPABASE_URL");let key="";
 try{key=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch(_){}
 key||=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!key)throw Error("Missing Supabase credentials");
 const headers={"apikey":key,"Content-Type":"application/json"};
 if(key.startsWith("eyJ"))headers.Authorization="Bearer "+key;
 return {url,headers};
}
function short(value,max){
 return typeof value==="string"?value.slice(0,max):null;
}
Deno.serve(async req=>{
 if(req.method!=="POST")return respond(405,{ok:false,error:"Method not allowed"});
 if(Deno.env.get("ASAAS_MODE")!=="sandbox")return respond(503,{ok:false,error:"Sandbox not configured"});
 const token=Deno.env.get("ASAAS_SANDBOX_WEBHOOK_TOKEN")||"";
 const key=Deno.env.get("ASAAS_SANDBOX_API_KEY")||"";
 if(token.length<32||!key)return respond(503,{ok:false,error:"Sandbox credentials not configured"});
 const incoming=req.headers.get("asaas-access-token")||"";
 if(!constantTime(incoming,token))return respond(401,{ok:false,error:"Webhook authorization failed"});
 if(Number(req.headers.get("content-length")||0)>16000)return respond(413,{ok:false,error:"Payload too large"});
 let body;
 try{const raw=await req.text();if(raw.length>16000)throw Error("Oversize");body=JSON.parse(raw);}
 catch(_){return respond(400,{ok:false,error:"Invalid body"});}
 const id=short(body?.id,150),event=short(body?.event,90);
 if(!id||id.length<5||!event||(!event.startsWith("PAYMENT_")&&!event.startsWith("SUBSCRIPTION_")))
  return respond(400,{ok:false,error:"Unrecognized Asaas event"});
 const payment=body.payment||{};
 let verified=false,verifiedStatus=short(payment?.status,60);
 const paymentId=short(payment?.id,120),subscriptionId=short(payment?.subscription,120);
 let externalReference=short(payment?.externalReference,180);
 // Never trust a claimed paid status in an incoming payload.
 if(event==="PAYMENT_RECEIVED"||event==="PAYMENT_CONFIRMED"){
   if(!paymentId||!/^[a-zA-Z0-9_-]{4,120}$/.test(paymentId))return respond(400,{ok:false,error:"Missing payment identifier"});
   try{
     const response=await fetch("https://api-sandbox.asaas.com/v3/payments/"+encodeURIComponent(paymentId),{
       method:"GET",headers:{"access_token":key,"User-Agent":"Editalume-Sandbox/0.1","Accept":"application/json"},signal:AbortSignal.timeout(11000)});
     if(!response.ok)throw Error("Asaas readback failed");
     const fresh=await response.json();
     if(fresh.id!==paymentId)throw Error("Payment mismatch");
     verified=true;verifiedStatus=short(fresh.status,60);
     externalReference=short(fresh.externalReference,180);
   }catch(_){return respond(503,{ok:false,error:"Payment read-back unavailable; retry event"});}
 }
 try{
  const svc=service();
  const item={environment:"sandbox",event_id:id,event_type:event,
   payment_id:paymentId,subscription_id:subscriptionId,
   external_reference:externalReference,payment_status:verifiedStatus,source_verified:verified};
  const url=svc.url+"/rest/v1/editalume_asaas_events?on_conflict=environment%2Cevent_id";
  const result=await fetch(url,{method:"POST",headers:{...svc.headers,
    Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify(item)});
  if(!result.ok)throw Error("Ledger insert failed");
  // A stored event is NOT proof of subscription activation.
  return respond(200,{ok:true,stored:true,entitlement_changed:false});
 }catch(_){return respond(503,{ok:false,error:"Temporary ledger outage; retry event"})}
});
