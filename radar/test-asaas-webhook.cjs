/* Sandboxed unit smoke: no real keys, no real Asaas or Supabase traffic. */
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const {webcrypto}=require("node:crypto");
const code=fs.readFileSync("supabase/functions/editalume-asaas-webhook-sandbox/index.ts","utf8");
const TOKEN="secure-dummy-test-token-that-is-long-123456789";
const env=new Map([["ASAAS_SANDBOX_WEBHOOK_TOKEN",TOKEN],
 ["SUPABASE_URL","https://test.supabase.co"],["SUPABASE_SERVICE_ROLE_KEY","eyJ.dummy.test"]]);
let handler, db=[];
const context={
  crypto:webcrypto, TextEncoder,Request,Response,JSON,Number,Promise,Set,
  Deno:{env:{get:key=>env.get(key)},serve:fn=>{handler=fn}},
  fetch:async(url,opts)=>{db.push({url,opts,body:JSON.parse(opts.body)});return new Response("",{status:201});}
};
vm.runInNewContext(code,context,{filename:"editalume-asaas-webhook-sandbox/index.ts"});
const url="https://test.supabase.co/functions/v1/editalume-asaas-webhook-sandbox";
const call=(obj,token=TOKEN,method="POST")=>handler(new Request(url,{method,...(method==="POST"?{
 headers:{"asaas-access-token":token,"content-type":"application/json"},
 body:JSON.stringify(obj)}:{})}));
(async()=>{
 assert.equal((await call({id:"evt_test_123",event:"PAYMENT_RECEIVED"},"bad-token")).status,401);
 assert.equal(db.length,0);
 env.delete("ASAAS_SANDBOX_WEBHOOK_TOKEN");
 assert.equal((await call({id:"evt_test_123",event:"PAYMENT_RECEIVED"})).status,503);
 env.set("ASAAS_SANDBOX_WEBHOOK_TOKEN",TOKEN);
 const event={id:"evt_test_123",event:"PAYMENT_RECEIVED",payment:{id:"pay_123",subscription:"sub_123",
  externalReference:"internal-sandbox-only",status:"RECEIVED",customer:"PII-MUST-NOT-BE-SAVED"}};
 const result=await call(event);
 assert.equal(result.status,200);
 assert.equal((await result.json()).ok,true);
 assert.equal(db.length,1);
 const item=db[0];
 assert.match(item.url,/on_conflict=environment,event_id/);
 assert.match(item.opts.headers.Prefer,/ignore-duplicates/);
 assert.equal(item.body.environment,"sandbox");
 assert.equal(item.body.event_id,"evt_test_123");
 assert.equal(item.body.payment_id,"pay_123");
 assert.equal(item.body.subscription_id,"sub_123");
 assert.equal(item.body.source_verified,true);
 assert.ok(!JSON.stringify(item.body).includes("customer"));
 const replay=await call(event);
 assert.equal(replay.status,200);
 assert.equal(db.length,2); // Both deliveries use idempotent DB conflict-ignore; no business grant.
 assert.equal((await call({id:"evt_new_456",event:"INVOICE_UNKNOWN"})).status,200);
 assert.equal(db.length,2);
 assert.equal((await call({id:"xx",event:"PAYMENT_RECEIVED"})).status,400);
 assert.equal((await call({},TOKEN,"GET")).status,405);
 console.log("PASS token authentication, missing-secret fail-closed, private ledger, no PII, replay safe and sandbox-only");
})().catch(e=>{console.error(e);process.exitCode=1});
