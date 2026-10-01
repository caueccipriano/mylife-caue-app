/** Automated visual/interaction smoke checks against LOCAL static Editalume site.
 * No network to PNCP, no email, no account access, no external writes.
 * Real shipped index has a separate unmocked offline smoke.
 */
const { chromium,webkit }=require("@playwright/test");
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
 make("00000000000004-1-000004/2026","SERVIÇOS DE CLIMATIZAÇÃO","Sorocaba",true,5000,6,old),
 {...make("00000000000005-1-000005/2026","HARMFUL OFFICIAL-LIKE LINK","Campinas",true,99999,2),source_url:"https://pncp.gov.br/app/editais/00000000000005/2026/5?redirect=evil"}
 ]};
// Exact official-looking URLs with an ID mismatch must never pass the UI or CSV.
fixture.opportunities.push({
 ...make("00000000000010-1-000010/2026","MISMATCHED PNCP NOTICE ID","Santos",false,1234,19),
 source_url:"https://pncp.gov.br/app/editais/00000000000011/2026/10"
});
// Missing observation timestamp must NOT be treated as just reconfirmed.
fixture.opportunities.push({
 ...make("00000000000012-1-000012/2026","UNCONFIRMED SAMPLE ENTRY","Ribeirão Preto",false,3210,19),
 last_seen_at:null
});
function success(name){console.log("PASS "+name)}
async function check(){
 const browser=await chromium.launch({headless:true});
 fs.mkdirSync("radar/qa-artifacts",{recursive:true});
 try{
  for(const shape of [{name:"desktop",width:1440,height:900},{name:"tablet-768",width:768,height:1024},{name:"mobile-390",width:390,height:844},{name:"mobile-320",width:320,height:740}]){
   const page=await browser.newPage({viewport:{width:shape.width,height:shape.height},acceptDownloads:true});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.route("**/radar/search-index.json*",route=>route.fulfill({json:fixture}));
   await page.route("**/radar/refresh-status.json*",route=>route.fulfill({json:{degraded:false,attempted_at:current}}));
   await page.goto(base,{waitUntil:"networkidle"});
   await page.waitForSelector(".result-card");
   const noticeDetails=page.locator(".notice-details");
   assert.equal(await noticeDetails.count(),1,"Technical warnings must be expandable, not a massive default block");
   assert.equal(await noticeDetails.getAttribute("open"),null);
   const noticeHeight=await page.locator("#notice").evaluate(el=>el.getBoundingClientRect().height);
   assert.ok(noticeHeight<180,"Default PNCP status must fit a compact card: "+noticeHeight);
   await noticeDetails.locator("summary").click();
   assert.match(await noticeDetails.innerText(),/Amostra parcial/);
   await noticeDetails.locator("summary").click();

   assert.match(await page.locator("#notice .notice-heading").innerText(),/Amostra atualizada/);
   assert.equal(await page.locator(".deadline-alert").count(),1,"Urgent deadlines should be clearly highlighted");
   assert.equal(await page.locator(".result-card").count(),3,"All sectors should be searched by default");
   assert.equal(await page.locator("#segment").inputValue(),"all");
   assert.match(await page.locator("#resultsCount").innerText(),/3 oportunidades/);
   assert.equal(await page.locator(".plan-free").count(),1);
   assert.equal(await page.locator(".plan-premium .plan-pending").count(),1,"Pro must disclose inactive billing");
   assert.match(await page.locator(".plan-premium h3").innerText(),/Editalume Pro/);
   assert.match(await page.locator(".plan-premium .plan-price").innerText(),/49,90/);
   assert.match(await page.locator(".plan-premium .plan-pending").innerText(),/não estão ativos/);
   assert.match(await page.locator(".plan-free").innerText(),/cinco favoritos sincronizados/);
   const proCta=page.locator(".plan-premium .plan-action");
   assert.match(await proCta.getAttribute("href"),/^mailto:cipristudios@gmail\.com\?/);
   assert.match(await proCta.innerText(),/quando o Pro estiver pronto/);
   assert.equal(await page.locator('a[href="./conta.html"]').count()>=2,true);
   await page.screenshot({path:"radar/qa-artifacts/"+shape.name+"-home.png",fullPage:true});
   success(shape.name+": homepage and honest freemium price");
   await page.selectOption("#segment","all");
   assert.equal(await page.locator(".result-card").count(),3);
   await page.uncheck("#observedOnly");
   assert.equal(await page.locator(".result-card").count(),5);
   assert.equal(await page.locator(".stale-tag").count(),2,"Old and undated records should be visibly unconfirmed");
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
   await page.locator("#alertPreview").screenshot({path:"radar/qa-artifacts/"+shape.name+"-alert-preview.png",animations:"disabled"});
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
   assert.ok(!csv.includes("HARMFUL OFFICIAL-LIKE LINK"),"Reject malformed official-looking PNCP links before rendering or exporting");
   assert.ok(!csv.includes("MISMATCHED PNCP NOTICE ID"),"Reject valid-host links for another procurement ID");
   const url=await page.locator(".result-card").first().locator("a").getAttribute("href");
   assert.ok(url.startsWith("https://pncp.gov.br/app/editais/"),"Cards must link only to PNCP");
   success(shape.name+": filters, stale badge, sort, export and official links");
   if(shape.width<=390){
     assert.equal(await page.locator(".key-hint").isVisible(),false,"Search hint must not crowd small screens");
     const measurements=await page.evaluate(()=>({
       doc:document.documentElement.scrollWidth,width:innerWidth,
       controls:[...document.querySelectorAll(".search-field,.search-panel,.result-card,.filter-grid,.plans-grid")]
         .map(e=>({cls:e.className,right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left}))
     }));
     assert.ok(measurements.doc<=measurements.width+2,"mobile horizontal overflow");
     assert.ok(measurements.controls.every(x=>x.left>=-2&&x.right<=measurements.width+2),
      "mobile search controls/cards must fit the screen: "+JSON.stringify(measurements.controls.filter(x=>x.left<-2||x.right>measurements.width+2)));
     await page.screenshot({path:"radar/qa-artifacts/mobile-390-search.png",fullPage:true});
     success(shape.name+": no clipped controls / document overflow");
   }
   assert.deepEqual(errors,[],"No JS page errors");
   await page.close();
  }
  // The older auxiliary sample has no last_seen_at per record. The checkbox
  // must automatically switch off and must not imply individual reconfirmation.
  const fallbackPage=await browser.newPage();
  const fallbackErrors=[];fallbackPage.on("pageerror",e=>fallbackErrors.push(e.message));
  await fallbackPage.route("**/radar/search-index.json*",route=>route.fulfill({status:503,body:"Unavailable"}));
  await fallbackPage.route("**/radar/opportunities.json*",route=>route.fulfill({json:{
    brand:"Editalume",generated_at:current,status:"sample_ok",rate_limited:true,catalog:[
      {...make("00000000000020-1-000020/2026","FALLBACK PUBLIC SAMPLE","Campinas",false,1200,3),last_seen_at:undefined}
    ],opportunities:[],records_examined:1
  }}));
  await fallbackPage.goto(base,{waitUntil:"networkidle"});
  await fallbackPage.waitForSelector(".result-card");
  assert.equal(await fallbackPage.locator(".result-card").count(),1);
  assert.equal(await fallbackPage.locator("#observedOnly").isChecked(),false);
  assert.equal(await fallbackPage.locator("#observedOnly").isDisabled(),true);
  assert.match(await fallbackPage.locator(".latest-toggle span").innerText(),/indisponível/);
  assert.match(await fallbackPage.locator("#notice .notice-heading").innerText(),/Cobertura parcial/);
  assert.match(await fallbackPage.locator("#notice").innerText(),/Limite temporário/);
  assert.deepEqual(fallbackErrors,[]);
  success("fallback sample: results accessible without false per-record freshness");
  await fallbackPage.close();
  // A total source outage must fail closed; never make archived data appear live.
  const outagePage=await browser.newPage();
  const outageErrors=[];outagePage.on("pageerror",e=>outageErrors.push(e.message));
  await outagePage.route("**/radar/search-index.json*",route=>route.fulfill({status:503,body:"Unavailable"}));
  await outagePage.route("**/radar/opportunities.json*",route=>route.fulfill({status:503,body:"Unavailable"}));
  await outagePage.goto(base,{waitUntil:"networkidle"});
  assert.match(await outagePage.locator("#resultsCount").innerText(),/temporariamente indisponível/);
  assert.equal(await outagePage.locator(".result-card").count(),0);
  assert.equal(await outagePage.locator("#csv").isDisabled(),true);
  assert.deepEqual(outageErrors,[]);
  success("total source outage: fail-closed state and no CSV export");
  await outagePage.close();
  // A partial index is not a total outage; distinguish it from true failures.
  for(const state of [
    {index_refresh:"partial",expected:/Cobertura parcial/,forbidden:/Atualização falhou/},
    {index_refresh:"failed",expected:/Atualização falhou/,forbidden:/Cobertura parcial/}
  ]){
    const statusPage=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];statusPage.on("pageerror",error=>errors.push(error.message));
    await statusPage.route("**/radar/search-index.json*",route=>route.fulfill({json:fixture}));
    await statusPage.route("**/radar/refresh-status.json*",route=>route.fulfill({json:{
      degraded:true,attempted_at:current,sample_refresh:"success",index_refresh:state.index_refresh
    }}));
    await statusPage.goto(base,{waitUntil:"networkidle"});
    await statusPage.waitForSelector(".result-card");
    const title=await statusPage.locator("#notice .notice-heading").innerText();
    assert.match(title,state.expected);
    assert.doesNotMatch(title,state.forbidden);
    assert.equal(await statusPage.locator(".result-card").count(),3);
    assert.deepEqual(errors,[]);
    success("refresh status "+state.index_refresh+": factual wording without hiding results");
    await statusPage.close();
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
  // WebKit approximates Safari layout and input behavior; real iOS device
  // acceptance remains a separate manual release requirement.
  const safari=await webkit.launch({headless:true});
  try{
   const page=await safari.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   await page.route("**/radar/search-index.json*",route=>route.fulfill({json:fixture}));
   await page.route("**/radar/refresh-status.json*",route=>route.fulfill({json:{degraded:false,attempted_at:current}}));
   await page.goto(base,{waitUntil:"networkidle"});
   await page.waitForSelector(".result-card");
   assert.equal(await page.locator(".result-card").count(),3);
   await page.selectOption("#city","Jundiaí");
   assert.equal(await page.locator(".result-card").count(),1);
   await page.click("#previewAlert");
   assert.equal(await page.locator(".preview-item").count(),1);
   const bounds=await page.evaluate(()=>({
     page:document.documentElement.scrollWidth,viewport:innerWidth,
     elements:[...document.querySelectorAll(".search-field,.search-panel,.result-card,.filter-grid,.plans-grid")]
       .map(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}))
   }));
   assert.ok(bounds.page<=bounds.viewport+2,"WebKit mobile must not overflow");
   assert.ok(bounds.elements.every(e=>e.left>=-2&&e.right<=bounds.viewport+2),"WebKit controls/cards must not clip");
   await page.screenshot({path:"radar/qa-artifacts/mobile-webkit-390.png",fullPage:false,animations:"disabled"});
   assert.deepEqual(errors,[]);
   success("WebKit mobile-390: search, premium preview and responsive layout");
   await page.close();
  }finally{await safari.close();}

 }finally{await browser.close();}
}
check().catch(err=>{console.error("QA FAILED:",err.stack||String(err));process.exitCode=1;});
