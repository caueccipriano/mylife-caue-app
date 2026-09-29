/** Editalume pilot evaluation intake.
 * Public GET challenge + signed POST, strict origin, honeypot, bounded HMAC IP
 * rate limiting. The service credential never leaves this Edge Function.
 * Public access: verify_jwt=false because requests authenticate with a
 * short-lived, HMAC-signed, IP-bound challenge issued by this handler. */
const ORIGINS=new Set(["https://caueccipriano.github.io","http://127.0.0.1:4173","http://localhost:4173"]);
const AREA=new Set(["limpeza_facilities","engenharia_manutencao","fornecimento","tecnologia","consultoria","outro"]);
const PROCUREMENT=new Set(["already_bid","considering","never","prefer_not"]);
const PRICE=new Set(["free_only","under_20","20_39","40_69","70_plus","unsure"]);
const FEATURES=new Set(["filtro_uf","alertas_email","prazos","exportacao","analise_ia","historico"]);
const encoder=new TextEncoder();
function backend(){
 const url=Deno.env.get("SUPABASE_URL");let key="";
 try{key=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch(_){}
 key||=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!key)throw Error("Missing private server configuration");
 const headers={"apikey":key,"Content-Type":"application/json"};
 if(key.startsWith("eyJ"))headers.Authorization="Bearer "+key;
 return {url,headers,key};
}
function cors(origin){return {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"GET,POST,OPTIONS",
 "Access-Control-Allow-Headers":"Content-Type","Vary":"Origin","Cache-Control":"no-store"}}
function reply(data,status,origin){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(origin)}})}
function ipOf(req){return (req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||
 (req.headers.get("x-forwarded-for")||"").split(",")[0].trim()||"unknown").slice(0,100)}
async function hmac(message,secret){
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(message)));
 return [...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function equal(a,b){
 if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
async function serviceCall(svc,path,options){
 const r=await fetch(svc.url+"/rest/v1/"+path,{...options,headers:{...svc.headers,...(options.headers||{})}});
 if(!r.ok)throw Error("Database operation failed: "+r.status);
 return r;
}
function str(v,max){return typeof v==="string"?v.trim().slice(0,max):""}
function validate(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 if(raw.website)return "bot";
 const company=str(raw.company,120)||null;
 const area=str(raw.business_area,40),proc=str(raw.procurement_stage,30),price=str(raw.price_band,20);
 const rating=raw.rating,comments=str(raw.comments,1000)||null,campaign=str(raw.campaign,40)||"pilot";
 const features=raw.useful_features;
 const consent=raw.contact_consent===true,email=str(raw.contact_email,160).toLowerCase()||null;
 if(company&&company.length<2||!AREA.has(area)||!PROCUREMENT.has(proc)||!PRICE.has(price)||
  !Number.isInteger(rating)||rating<1||rating>5||
  !Array.isArray(features)||features.length<1||features.length>6||
  new Set(features).size!==features.length||features.some(x=>!FEATURES.has(x))||
  !/^[A-Za-z0-9_-]{1,40}$/.test(campaign)||
  (email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))||
  (email&&!consent)||(!email&&consent))return null;
 return {company,business_area:area,procurement_stage:proc,rating,useful_features:features,
  price_band:price,comments,contact_email:email,contact_consent:consent,campaign};
}
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"";
 if(!ORIGINS.has(origin))return reply({ok:false,error:"Origem não autorizada"},403,origin);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
 let svc;try{svc=backend()}catch(_){return reply({ok:false,error:"Formulário temporariamente indisponível"},503,origin)}
 const ip=ipOf(req);
 if(req.method==="GET"){
  const expires=Date.now()+10*60*1000,nonce=crypto.randomUUID();
  const signature=await hmac("pilot:"+ip+":"+nonce+":"+expires,svc.key);
  return reply({ok:true,challenge:nonce+"."+expires+"."+signature,expires},200,origin);
 }
 if(req.method!=="POST")return reply({ok:false,error:"Método não permitido"},405,origin);
 if(Number(req.headers.get("content-length")||0)>14000)return reply({ok:false,error:"Resposta muito longa"},413,origin);
 let raw;
 try{const body=await req.text();if(body.length>14000)throw Error("oversize");raw=JSON.parse(body)}
 catch(_){return reply({ok:false,error:"Resposta inválida"},400,origin)}
 const challenge=str(raw.challenge,180),pieces=challenge.split(".");
 if(pieces.length!==3||!/^[0-9a-f-]{36}$/.test(pieces[0])||!/^[0-9]{13}$/.test(pieces[1]))return reply({ok:false,error:"Recarregue o formulário"},403,origin);
 const expiry=Number(pieces[1]);
 if(!Number.isSafeInteger(expiry)||expiry<Date.now()||expiry>Date.now()+11*60*1000)return reply({ok:false,error:"Formulário expirado"},403,origin);
 const expected=await hmac("pilot:"+ip+":"+pieces[0]+":"+pieces[1],svc.key);
 if(!equal(pieces[2],expected))return reply({ok:false,error:"Sessão inválida"},403,origin);
 const data=validate(raw);
 if(data==="bot")return reply({ok:true},200,origin);
 if(!data)return reply({ok:false,error:"Revise as respostas obrigatórias"},400,origin);
 try{
  const minute=Math.floor(Date.now()/(60*60*1000));
  const fingerprint=await hmac("pilot-rate:"+ip+":"+minute,svc.key);
  const seen=await serviceCall(svc,"editalume_feedback_throttle?select=id&fingerprint=eq."+fingerprint+"&limit=3",{method:"GET"});
  const rows=await seen.json();
  if(rows.length>=3)return reply({ok:false,error:"Limite temporário de avaliações atingido"},429,origin);
  await serviceCall(svc,"editalume_feedback_throttle",{method:"POST",headers:{"Prefer":"return=minimal"},
    body:JSON.stringify({fingerprint})});
  await serviceCall(svc,"editalume_pilot_feedback",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(data)});
  // Best-effort purge of short-lived, irreversible hashed anti-abuse markers.
  const old=new Date(Date.now()-48*60*60*1000).toISOString();
  serviceCall(svc,"editalume_feedback_throttle?created_at=lt."+encodeURIComponent(old),{method:"DELETE"}).catch(()=>{});
  return reply({ok:true},201,origin);
 }catch(_){return reply({ok:false,error:"Não foi possível registrar agora. Tente novamente."},503,origin)}
});
