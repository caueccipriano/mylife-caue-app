/* Account SDK is only downloaded on the homepage if there is a persisted session.
   Guests retain local browsing; auth is offered at conta.html. */
try{
 if(localStorage.getItem("sb-jhxhbgprjqppzfrjdfvj-auth-token")){
   import("./account.js?v=1").catch(()=>{});
 }
}catch(_ignored){}
