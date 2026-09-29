/* Pilot survey functional QA. Never writes to actual project or sends email. */
const {chromium,webkit}=require("@playwright/test");
const assert=require("node:assert/strict");
const fs=require("fs");
const BASE="http://127.0.0.1:4173/radar/avaliar.html";
async function run(browser,label,width,height,withContact){
 const page=await browser.newPage({viewport:{width,height}});
 let getCalls=0,postCalls=[];
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const headers={"access-control-allow-origin":"http://127.0.0.1:4173",
  "access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Content-Type",
  "content-type":"application/json"};
 await page.route("**/functions/v1/editalume-feedback",route=>{
  const req=route.request();
  if(req.method()==="OPTIONS")return route.fulfill({status:204,headers,body:""});
  if(req.method()==="GET"){getCalls++;return route.fulfill({status:200,headers,
   json:{ok:true,challenge:"00000000-0000-4000-8000-000000000000.9999999999999."+"a".repeat(64),
   expires:9999999999999}});}
  if(req.method()==="POST"){postCalls.push(JSON.parse(req.postData()));
   return route.fulfill({status:201,headers,json:{ok:true}});}
  return route.abort();
 });
 await page.goto(BASE,{waitUntil:"networkidle"});
 assert.equal(await page.title(),"Avalie o Editalume · Pesquisa com empresas");
 assert.ok(await page.getByRole("link",{name:/explorar plataforma/i}).count());
 const radio=async(name,value)=>page.locator('input[name="'+name+'"][value="'+value+'"]').check();
 await page.getByRole("button",{name:/enviar avaliação/i}).click();
 assert.match(await page.locator("#feedback-status").innerText(),/obrigatórias/);
 assert.equal(postCalls.length,0,"Incomplete form must never send");
 await radio("business_area","limpeza_facilities");
 await radio("procurement_stage","already_bid");
 await page.locator('label:has(input[name="rating"][value="4"])').click();
 assert.equal(await page.locator('input[name="rating"][value="4"]').isChecked(),true);
 await page.locator('input[name="useful_features"][value="filtro_uf"]').check();
 await page.locator('input[name="useful_features"][value="alertas_email"]').check();
 await radio("price_band","20_39");
 await page.fill("#company","Empresa de demonstração");
 await page.fill("#comments","Gostaria de receber alertas por estado.");
 if(withContact){
  await page.fill("#contact_email","piloto@example.org");
  await page.getByRole("button",{name:/enviar avaliação/i}).click();
  assert.match(await page.locator("#feedback-status").innerText(),/assinale a autorização/);
  assert.equal(postCalls.length,0,"No optional email is sent without opt-in");
  await page.locator("#contact_consent").check();
 }
 if(width<=390){
  const bounds=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,inner:innerWidth,
    card:document.querySelector(".form-card").getBoundingClientRect().toJSON()
  }));
  assert.ok(bounds.scroll<=bounds.inner+2,"Small screen must not overflow");
  assert.ok(bounds.card.right<=bounds.inner+2&&bounds.card.left>=-2,"Form card must fit screen");
 }
 await page.getByRole("button",{name:/enviar avaliação/i}).click();
 await page.locator("#thanks").waitFor({state:"visible"});
 assert.equal(postCalls.length,1);
 const response=postCalls[0];
 assert.equal(response.business_area,"limpeza_facilities");
 assert.equal(response.rating,4);
 assert.deepEqual(response.useful_features,["filtro_uf","alertas_email"]);
 assert.equal(response.contact_consent,withContact);
 assert.equal(response.contact_email,withContact?"piloto@example.org":"");
 assert.ok(response.challenge&&response.challenge.startsWith("00000000-"));
 assert.equal(await page.locator("#feedback").isVisible(),false);
 assert.ok(getCalls>=1);assert.deepEqual(errors,[]);
 fs.mkdirSync("radar/qa-artifacts",{recursive:true});
 await page.screenshot({path:"radar/qa-artifacts/pilot-survey-"+label+".png",fullPage:true});
 console.log("PASS "+label+": required fields, confidential opt-in, signed intake mock and mobile layout");
 await page.close();
}
(async()=>{
 const chromiumBrowser=await chromium.launch({headless:true});
 try{await run(chromiumBrowser,"desktop-1366",1366,850,false);
     await run(chromiumBrowser,"mobile-320",320,740,false);}
 finally{await chromiumBrowser.close();}
 const safari=await webkit.launch({headless:true});
 try{await run(safari,"webkit-390",390,844,true);}
 finally{await safari.close();}
})().catch(err=>{console.error("SURVEY QA FAILED",err.stack||err);process.exitCode=1});
