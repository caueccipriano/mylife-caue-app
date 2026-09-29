/** Automated visual/interaction smoke checks against LOCAL static Editalume site.
 * No network to PNCP, no email, no account access, no external writes.
 * Real shipped index has a separate unmocked offline smoke.
 */
const { chromium }=require("@playwright/test");
const fs=require("fs");
const assert=require("node:assert/strict");
const base="http://127.0.0.1:4173/radar/";
const now=Date.now();
const when=days=>new Date(now+days*86400000).toISOString();
const current=new Date().toISOString();
const old=new Date(now-2*86400000).toISOString();
const make=(id,description,city,sector,value,days,seen=current,mode="Pregão eletrônico")=>({
 id,object:description,organ:"Órgão de teste",city,uf:"SP",deadline:when(days),
 modality:mode,estimated_value_brl:value,sector_focus:sector,relevance:sector?2:0,
 first_seen_at:current,last_seen_at:seen,
 source_url:"https://pncp.gov.br/app/editais/"+id.split("-")[0]+"/2026/"+String(Number(id.match(/-(\d+)\//)[1]))
});
const fixture={brand:"Editalume",generated_at:current,format_version:2,partial:false,
 records_examined_this_run:12,carried_forward_unreconfirmed:1,exhaustive:false,
 opportunities:[
 make("00000000000001-1-000001/2026","SERVIÇOS DE LIMPEZA E CONSERVAÇÃO PREDIAL","Campinas",true,2500,3),
 make("00000000000002-1-000002/2026","MANUTENÇÃO ELÉTRICA PREDIAL","Jundiaí",true,9000,11),
 make("00000000000003-1-000003/2026","COMPRA DE PAPEL SULFITE","São Paulo",false,1200,15),
 make("00000000000004-1-000004/2026","SERVIÇOS DE CLIMATIZAÇÃO","Sorocaba",true,5000,6,old)
 ]};
function success(name){console.log("PASS "+name)}
async function check(){
 const browser=await chromium.launch({headless:true});
 fs.mkdirSync("radar/qa-artifacts",{recursive:true});
 try{
  for(const shape of [{name:"desktop",width:1440,height:900},{name:"mobile-390",width:390,height:844}]){
   const page=await browser.newPage({viewport:{width:shape.width,height:shape.height},acceptDownloads:true});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.route("**/radar/search-index.json*",route=>route.fulfill({json:fixture}));
   await page.route("**/radar/refresh-status.json*",route=>route.fulfill({json:{degraded:false,attempted_at:current}}));
   await page.goto(base,{waitUntil:"networkidle"});
   await page.waitForSelector(".result-card");
   assert.equal(await page.locator(".result-card").count(),2,"Two recently observed focus results expected");
   assert.match(await page.locator("#resultsCount").innerText(),/2 oportunidades/);
   assert.equal(await page.locator(".plan-free").count(),1);
   assert.equal(await page.locator(".plan-premium .plan-pending").count(),1,"Premium must not claim live checkout");
   await page.screenshot({path:"radar/qa-artifacts/"+shape.name+"-home.png",fullPage:true});
   success(shape.name+": homepage and honest freemium price");
   await page.selectOption("#segment","all");
   assert.equal(await page.locator(".result-card").count(),3);
   await page.uncheck("#observedOnly");
   assert.equal(await page.locator(".result-card").count(),4);
   assert.equal(await page.locator(".stale-tag").count(),1,"Prior records should be visibly unconfirmed");
   await page.fill("#q","limpeza");
   assert.equal(await page.locator(".result-card").count(),1);
   await page.fill("#q","");
   await page.selectOption("#city","Jundiaí");
   assert.equal(await page.locator(".result-card").count(),1);
   await page.selectOption("#city","");
   await page.selectOption("#deadline","7");
   assert.equal(await page.locator(".result-card").count(),2);
   await page.selectOption("#deadline","all");
   await page.selectOption("#segment","focus");
   await page.check("#observedOnly");
   await page.selectOption("#sort","value");
   assert.match(await page.locator(".result-card").first().innerText(),/MANUTENÇÃO ELÉTRICA/);
   await page.click("#previewAlert");
   assert.equal(await page.locator("#alertPreview").isVisible(),true);
   assert.match(await page.locator("#previewSummary").innerText(),/2 oportunidades/);
   assert.equal(await page.locator(".preview-item").count(),2);
   assert.match(await page.locator(".preview-disclaimer").innerText(),/Nenhum e-mail é enviado/);
   await page.screenshot({path:"radar/qa-artifacts/"+shape.name+"-alert-preview.png",fullPage:false});
   await page.click("#closePreview");
   assert.equal(await page.locator("#alertPreview").isVisible(),false);
   success(shape.name+": honest Pro preview, no registration");
   const download=page.waitForEvent("download");
   await page.click("#csv");
   const file=await download;
   assert.match(file.suggestedFilename(),/editalume.*csv/);
   const saved="radar/qa-artifacts/"+shape.name+"-filtered.csv";
   await file.saveAs(saved);
   const csv=fs.readFileSync(saved,"utf8");
   assert.match(csv,/Jundiaí/);assert.match(csv,/Campinas/);
   assert.ok(!csv.includes("PAPEL SULFITE"),"CSV must contain only filtered data");
   const url=await page.locator(".result-card").first().locator("a").getAttribute("href");
   assert.ok(url.startsWith("https://pncp.gov.br/app/editais/"),"Cards must link only to PNCP");
   success(shape.name+": filters, stale badge, sort, export and official links");
   if(shape.width===390){
     const measurements=await page.evaluate(()=>({
       doc:document.documentElement.scrollWidth,width:innerWidth,
       controls:[...document.querySelectorAll(".search-field,.search-panel,.result-card,.filter-grid,.plans-grid")]
         .map(e=>({cls:e.className,right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left}))
     }));
     assert.ok(measurements.doc<=measurements.width+2,"mobile horizontal overflow");
     assert.ok(measurements.controls.every(x=>x.left>=-2&&x.right<=measurements.width+2),
      "mobile search controls/cards must fit the screen: "+JSON.stringify(measurements.controls.filter(x=>x.left<-2||x.right>measurements.width+2)));
     await page.screenshot({path:"radar/qa-artifacts/mobile-390-search.png",fullPage:true});
     success("mobile-390: no clipped controls / document overflow");
   }
   assert.deepEqual(errors,[],"No JS page errors");
   await page.close();
  }
  const livePage=await browser.newPage({viewport:{width:1300,height:850}});
  const jsErrors=[];livePage.on("pageerror",e=>jsErrors.push(e.message));
  await livePage.goto(base,{waitUntil:"networkidle"});
  const count=await livePage.locator(".result-card").count();
  assert.ok(count>=1,"Shipped public sample must render records");
  assert.ok(await livePage.locator("#notice").innerText(),"Data timestamp/status should be visible");
  assert.deepEqual(jsErrors,[]);
  success("actual shipped index: "+count+" initial cards render; timestamp warning visible");
  await livePage.close();
 }finally{await browser.close();}
}
check().catch(err=>{console.error("QA FAILED:",err.stack||String(err));process.exitCode=1;});
