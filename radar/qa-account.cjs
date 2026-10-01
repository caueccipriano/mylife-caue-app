/* No emails, production auth requests, or real database writes.
   Browser mock verifies account screen, Magic Link request and favorites. */
const {chromium}=require("@playwright/test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const base="http://127.0.0.1:4173/radar/";
const sdk=`
let user=null;
let favorites=[];
export function createClient(){
  const chainFor=table=>{
    const chain={
      select(){return this;},eq(){return this;},order(){return this;},
      async limit(){return {data:favorites,error:null};},
      async maybeSingle(){return {data:null,error:null};},
      async insert(row){favorites.push({...row,created_at:new Date().toISOString()});return {error:null};},
      delete(){
        let id=null;
        return {eq(k,v){if(k==="pncp_id")id=v;return this;},
          then(resolve){favorites=favorites.filter(x=>x.pncp_id!==id);return Promise.resolve({error:null}).then(resolve);}
        };
      }
    };return chain;
  };
  globalThis.__testLogin=()=>{user={id:"00000000-0000-4000-8000-000000000001",email:"empresa@example.org"};};
  globalThis.__testCount=()=>favorites.length;
  return {
    auth:{
      async getSession(){return {data:{session:user?{user}:null},error:null};},
      async getUser(){return {data:{user},error:null};},
      onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},
      async signInWithOtp(req){globalThis.__testMailRequest=req;return {error:null};},
      async signOut(){user=null;return {error:null};}
    },
    from:chainFor
  };
}
`;
async function run(){
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm",
   r=>r.fulfill({status:200,contentType:"application/javascript",headers:{"Access-Control-Allow-Origin":"*"},body:sdk}));
  await page.goto(base+"conta.html",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>!!window.EditalumeAccount);
  assert.match(await page.locator("#account-status").innerText(),/Entre com um link/);
  assert.equal(await page.locator("#account-login").isVisible(),true);
  assert.equal(await page.locator("#account-panel").isVisible(),false);
  await page.locator("#account-login-email").fill("empresa@example.org");
  await page.locator("#account-login-button").click();
  await page.waitForFunction(()=>!!window.__testMailRequest);
  const redirect=await page.evaluate(()=>window.__testMailRequest.options.emailRedirectTo);
  assert.equal(redirect,base+"conta.html");
  assert.match(await page.locator("#account-status").innerText(),/Confira sua caixa/);
  console.log("PASS passwordless login sends only an email-link request to whitelisted account page");
  await page.evaluate(async()=>{window.__testLogin();await window.EditalumeAccount.refresh();});
  assert.equal(await page.locator("#account-panel").isVisible(),true);
  assert.match(await page.locator("#account-plan").innerText(),/Grátis/);
  assert.match(await page.locator("#account-favorites-count").innerText(),/0 \/ 5/);
  await page.evaluate(()=>window.EditalumeAccount.toggleFavorite({
   pncp_id:"12345678901234-1-7/2026",title:"SERVIÇO DE TESTE",
   uf:"SP",closing_at:"2026-10-18T19:00:00Z"
  }));
  await page.waitForFunction(()=>window.__testCount()===1);
  assert.match(await page.locator(".account-favorite").innerText(),/SERVIÇO DE TESTE/);
  await page.getByRole("button",{name:"Remover"}).click();
  await page.waitForFunction(()=>window.__testCount()===0);
  await page.locator("#account-logout").click();
  assert.equal(await page.locator("#account-login").isVisible(),true);
  assert.deepEqual(errors,[]);
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  assert.ok(width.scroll<=width.inner+2,"Mobile account page must fit");
  fs.mkdirSync("radar/qa-artifacts",{recursive:true});
  await page.screenshot({path:"radar/qa-artifacts/account-mobile.png",fullPage:true});
  console.log("PASS free account, cloud favorite add/remove, sign-out and mobile layout");
 }finally{await browser.close();}
}
run().catch(e=>{console.error("ACCOUNT QA FAILED",e.stack||e);process.exitCode=1});
