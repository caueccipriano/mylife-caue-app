/** Editalume BR-01: national interface mocked only at public REST boundary.
 * Tests do not write to the database or depend on API rate availability. */
const {chromium,webkit}=require("@playwright/test");
const assert=require("node:assert/strict");
const fs=require("fs");
const BASE="http://127.0.0.1:4173/radar/";
const UFS="AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const COVERAGE=UFS.map(uf=>({uf,status:uf==="SP"||uf==="RJ"?"partial":"not_started",
 last_success_at:uf==="SP"||uf==="RJ"?new Date().toISOString():null,records_examined:uf==="SP"?600:uf==="RJ"?100:0}));
const future=d=>new Date(Date.now()+d*86400000).toISOString();
const records=[
 {pncp_id:"00000000000001-1-1/2026",uf:"SP",municipality:"Campinas",agency:"Prefeitura de teste",title:"SERVIÇOS DE LIMPEZA PREDIAL",modality:"Pregão eletrônico",estimated_value_brl:12000,closing_at:future(6),sector_focus:true,relevance:3,first_observed_at:new Date().toISOString(),last_observed_at:new Date().toISOString()},
 {pncp_id:"00000000000002-1-2/2026",uf:"RJ",municipality:"Niterói",agency:"Órgão de teste",title:"AQUISIÇÃO DE PAPEL",modality:"Dispensa",estimated_value_brl:3000,closing_at:future(13),sector_focus:false,relevance:0,first_observed_at:new Date().toISOString(),last_observed_at:new Date().toISOString()},
 {pncp_id:"00000000000003-1-3/2026",uf:"SP",municipality:"Santos",agency:"Órgão de teste",title:"MANUTENÇÃO DE CLIMATIZAÇÃO",modality:"Pregão eletrônico",estimated_value_brl:29000,closing_at:future(18),sector_focus:true,relevance:2,first_observed_at:new Date().toISOString(),last_observed_at:new Date().toISOString()}
];
function subset(filters){
 let arr=records.filter(x=>(!filters.p_uf||x.uf===filters.p_uf)
   &&(!filters.p_q||[x.title,x.agency,x.municipality].join(" ").toLowerCase().includes(filters.p_q.toLowerCase()))
   &&(filters.p_focus===null||x.sector_focus===filters.p_focus)
   &&(!filters.p_days||new Date(x.closing_at)-Date.now()<=filters.p_days*86400000)
   &&(!filters.p_min_value||x.estimated_value_brl>=filters.p_min_value)
   &&(!filters.p_city||x.municipality.toLowerCase().includes(filters.p_city.toLowerCase())));
 arr.sort((a,b)=>filters.p_sort==="value"?b.estimated_value_brl-a.estimated_value_brl:new Date(a.closing_at)-new Date(b.closing_at));
 return arr.slice(filters.p_offset||0,(filters.p_offset||0)+24).map(r=>({...r,total_count:arr.length}));
}
async function run(browser,name,width,height){
 const page=await browser.newPage({viewport:{width,height},acceptDownloads:true});
 const errors=[],apiCalls=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route("**/rest/v1/editalume_uf_coverage*",r=>r.fulfill({json:COVERAGE}));
 await page.route("**/rest/v1/rpc/editalume_search*",r=>{
  const filters=JSON.parse(r.request().postData());apiCalls.push(filters);
  return r.fulfill({json:subset(filters)});
 });
 await page.goto(BASE,{waitUntil:"networkidle"});
 await page.waitForFunction(()=>document.getElementById("national-result-count")?.textContent?.includes("3 editais"));
 assert.equal(await page.locator(".national-result-card").count(),3);
 assert.equal(await page.locator("#national-uf-count").innerText(),"2/27");
 assert.equal(await page.locator(".national-state").count(),27);
 assert.equal(await page.locator('.national-state[aria-pressed="false"]').count(),27);
 assert.match(await page.locator("#national-status").innerText(),/conectada/);
 assert.ok(await page.locator(".national-result-card").first().locator('a[href^="https://pncp.gov.br/app/editais/"]').count());
 if(width<=390){const box=await page.evaluate(()=>({
  doc:document.documentElement.scrollWidth,inner:innerWidth,
  cards:[...document.querySelectorAll(".national-search-card,.national-primary-filters,.national-secondary-filters,.national-result-card,.national-state-grid")].map(x=>({left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right}))
 }));
 assert.ok(box.doc<=box.inner+2,"Mobile document overflow");
 assert.ok(box.cards.every(x=>x.left>=-2&&x.right<=box.inner+2),"National cards must fit mobile viewport");
 }
 await page.selectOption("#national-uf","RJ");
 await page.waitForFunction(()=>document.getElementById("national-result-count")?.textContent?.includes("1 edital"));
 assert.equal(await page.locator(".national-result-card").count(),1);
 assert.match(await page.locator(".national-result-card").first().innerText(),/Niterói/);
 assert.equal(await page.locator('.national-state[aria-pressed="true"]').count(),1);
 await page.selectOption("#national-uf","AM");
 await page.waitForFunction(()=>document.getElementById("national-empty-title")?.textContent?.includes("Amazonas"));
 assert.match(await page.locator("#national-empty-description").innerText(),/ainda não há amostra/);
 await page.click("#national-reset");
 await page.waitForFunction(()=>document.getElementById("national-result-count")?.textContent?.includes("3 editais"));
 await page.fill("#national-q","climatização");
 await page.waitForFunction(()=>document.getElementById("national-result-count")?.textContent?.includes("1 edital"));
 const wait=page.waitForEvent("download");await page.click("#national-download");const dl=await wait;assert.equal(dl.suggestedFilename(),"editalume-brasil-pagina.csv");
 fs.mkdirSync("radar/qa-artifacts",{recursive:true});
 await dl.saveAs("radar/qa-artifacts/"+name+"-national.csv");
 assert.match(fs.readFileSync("radar/qa-artifacts/"+name+"-national.csv","utf8"),/Santos/);
 if(width<=390)await page.locator(".national-search-card").screenshot({path:"radar/qa-artifacts/"+name+"-national.png"});
 assert.ok(apiCalls.some(x=>x.p_uf==="RJ")&&apiCalls.some(x=>x.p_uf==="AM"));
 assert.deepEqual(errors,[]);
 console.log("PASS "+name+" national: data, 27 states, region filters, empty coverage, CSV, viewport");
 await page.close();
}
(async()=>{
 const chrome=await chromium.launch({headless:true});
 try{await run(chrome,"desktop-1400",1400,900);await run(chrome,"mobile-320",320,740);}finally{await chrome.close();}
 const safari=await webkit.launch({headless:true});
 try{await run(safari,"webkit-390",390,844);}finally{await safari.close();}
})().catch(e=>{console.error("NATIONAL QA FAILED",e.stack||e);process.exitCode=1});
