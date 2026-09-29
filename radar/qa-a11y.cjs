/**
 * Editalume pre-launch WCAG automated audit (synthetic public fixtures only).
 * Uses local static frontend; no customer data, purchases or remote PNCP calls.
 * Read report artifacts for manual follow-up; serious/critical violations fail CI.
 * Full accessibility acceptance still requires manual keyboard & screen reader QA.
 */
const {chromium}=require("@playwright/test");
const AxeBuilder=require("@axe-core/playwright").default;
const fs=require("node:fs");
const path=require("node:path");
const base="http://127.0.0.1:4173/radar/";
const now=new Date();
const stamp=now.toISOString();
const future=d=>new Date(now.getTime()+d*864e5).toISOString();
const make=(n,object,city,focus)=>({
 id:"0000000000000"+n+"-1-00000"+n+"/2026",
 source_url:"https://pncp.gov.br/app/editais/0000000000000"+n+"/2026/"+n,
 object,organ:"Órgão fictício de acessibilidade",city,uf:"SP",
 modality:"Pregão eletrônico",deadline:future(3+n),
 estimated_value_brl:2500*n,sector_focus:focus,relevance:focus?2:0,
 first_seen_at:stamp,last_seen_at:stamp
});
const fixture={
 brand:"Editalume",format_version:2,generated_at:stamp,
 partial:false,exhaustive:false,records_examined_this_run:3,
 carried_forward_unreconfirmed:0,
 opportunities:[
  make(1,"SERVIÇOS DE LIMPEZA E CONSERVAÇÃO PREDIAL","Campinas",true),
  make(2,"MANUTENÇÃO PREDIAL","Jundiaí",true),
  make(3,"AQUISIÇÃO DE COMPUTADORES","São Paulo",false)
 ]
};
async function audit(page,label,errors){
 const results=await new AxeBuilder({page})
   .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","best-practice"])
   .analyze();
 const issues=results.violations.map(v=>({
   id:v.id,impact:v.impact,description:v.description,
   help:v.help,helpUrl:v.helpUrl,
   nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))
 }));
 const high=issues.filter(i=>["critical","serious"].includes(i.impact));
 fs.writeFileSync(path.join("radar/qa-artifacts","a11y-"+label+".json"),
   JSON.stringify({label,violations:issues,incomplete:results.incomplete.map(i=>({id:i.id,impact:i.impact,targets:i.nodes.map(n=>n.target)})),pageErrors:errors},null,2));
 console.log("A11Y "+label+": "+issues.length+" violations ("+high.length+" serious/critical), "+results.incomplete.length+" manual checks");
 for(const i of high)console.error("FAIL "+label+" "+i.id+" ("+i.impact+"): "+i.nodes.map(x=>x.target.join(" ")).join(", "));
 if(errors.length)console.error("JS errors on "+label+": "+errors.join("; "));
 return high.length===0&&errors.length===0;
}
(async()=>{
 fs.mkdirSync("radar/qa-artifacts",{recursive:true});
 const browser=await chromium.launch({headless:true});
 let passed=true;
 try{
  for(const config of [{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844}]){
   const context=await browser.newContext({viewport:{width:config.width,height:config.height}});
   const page=await context.newPage();
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.route("**/radar/search-index.json*",r=>r.fulfill({json:fixture}));
   await page.route("**/radar/refresh-status.json*",r=>r.fulfill({json:{degraded:false,attempted_at:stamp}}));
   await page.goto(base,{waitUntil:"networkidle"});
   await page.waitForSelector(".result-card");
   if(!await audit(page,config.name+"-home",errors))passed=false;
   await page.fill("#q","manutenção");
   if(!await audit(page,config.name+"-filtered",errors))passed=false;
   await page.click("#previewAlert");
   if(!await audit(page,config.name+"-premium-preview",errors))passed=false;
   await page.close();
   await context.close();
  }
 }finally{await browser.close();}
 if(!passed)process.exitCode=1;
})().catch(e=>{console.error("A11Y RUN FAILED: "+(e.stack||e));process.exitCode=1;});
