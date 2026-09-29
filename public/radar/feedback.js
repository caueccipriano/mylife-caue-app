/* Editalume pilot feedback: no payment data and no public database writes. */
(()=>{
"use strict";
const API="https://jhxhbgprjqppzfrjdfvj.supabase.co/functions/v1/editalume-feedback";
const form=document.getElementById("feedback");
if(!form)return;
const status=document.getElementById("feedback-status"),send=document.getElementById("send");
let challenge=null,expires=0,submitting=false;
function notify(text,error=false){status.textContent=text;status.className="feedback-status"+(error?" error":"");}
const params=new URLSearchParams(location.search);
const rawCampaign=params.get("origem")||"pilot";
const campaign=/^[A-Za-z0-9_-]{1,40}$/.test(rawCampaign)?rawCampaign:"pilot";
async function getChallenge(){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
 try{
  const r=await fetch(API,{method:"GET",headers:{Accept:"application/json"},mode:"cors",cache:"no-store",signal:controller.signal});
  if(!r.ok)throw Error("API "+r.status);
  const data=await r.json();
  if(!data.ok||typeof data.challenge!=="string"||!Number.isFinite(data.expires))throw Error("API inválida");
  challenge=data.challenge;expires=data.expires;notify("");
 }finally{clearTimeout(timeout);}
}
getChallenge().catch(()=>notify("A conexão com o formulário está instável. Você pode preencher as perguntas e tentar enviar depois.",true));
form.addEventListener("submit",async event=>{
 event.preventDefault();
 if(submitting)return;
 if(!form.checkValidity()){form.reportValidity();notify("Revise as respostas obrigatórias.",true);return;}
 const chosen=[...form.querySelectorAll('[name="useful_features"]:checked')].map(x=>x.value);
 if(!chosen.length){notify("Escolha pelo menos uma funcionalidade da pergunta 4.",true);form.querySelector('[name="useful_features"]').focus();return;}
 const email=form.elements.contact_email.value.trim();
 const consent=form.elements.contact_consent.checked;
 if((email&&!consent)||(!email&&consent)){
  notify("Se informar um e-mail, assinale a autorização. Caso contrário, desmarque a autorização.",true);
  (email?form.elements.contact_consent:form.elements.contact_email).focus();return;
 }
 const body={
  company:form.elements.company.value.trim(),business_area:form.querySelector('[name="business_area"]:checked').value,
  procurement_stage:form.querySelector('[name="procurement_stage"]:checked').value,
  rating:Number(form.querySelector('[name="rating"]:checked').value),useful_features:chosen,
  price_band:form.querySelector('[name="price_band"]:checked').value,
  comments:form.elements.comments.value.trim(),contact_email:email,
  contact_consent:consent,campaign,website:form.elements.website.value
 };
 submitting=true;send.disabled=true;send.textContent="Enviando avaliação...";notify("");
 try{
  if(!challenge||expires-Date.now()<30000)await getChallenge();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  let response;
  try{response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify({...body,challenge}),cache:"no-store",mode:"cors",signal:controller.signal});}
  finally{clearTimeout(timeout);}
  let result={};try{result=await response.json()}catch(_){}
  if(!response.ok||result.ok!==true){
   if(response.status===429)throw Error("Recebemos várias avaliações recentemente. Aguarde um pouco para enviar outra.");
   if(response.status===403){challenge=null;throw Error("Sua sessão expirou. Tente enviar novamente.");}
   throw Error(result.error||"Não foi possível enviar agora. Tente novamente.");
  }
  form.hidden=true;document.getElementById("thanks").hidden=false;
  document.getElementById("thanks").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(err){notify(err instanceof Error?err.message:"Erro de conexão. Tente novamente.",true);
  if(!challenge)getChallenge().catch(()=>{});}
 finally{submitting=false;send.disabled=false;send.textContent="Enviar avaliação →";}
});
})();
