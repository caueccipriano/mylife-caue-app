"""Editalume Premium alert-generation engine: DRY RUN ONLY.

This module never sends mail, collects recipients, checks payments, or changes
customer data. Real subscription entitlements, consent, delivery and unsubscribe
must be implemented through a private, authenticated backend before launch.
No recipient registry belongs in the public GitHub repository.
"""
from __future__ import annotations
import argparse
import json
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

MAX_AGE = timedelta(hours=36)
MIN_RESPONSE_TIME = timedelta(hours=12)
MAX_RESULTS = 12
URL = re.compile(r"https://pncp\.gov\.br/app/editais/(\d{14})/(\d{4})/(\d+)/?")

def norm(value):
    return " ".join(unicodedata.normalize("NFKD", str(value or "")).encode("ascii","ignore").decode("ascii").lower().split())

def parse_date(value):
    try:
        d=datetime.fromisoformat(value.replace("Z","+00:00"))
        return d if d.tzinfo is not None else None
    except (ValueError,AttributeError,TypeError):
        return None

def canonical(item):
    ident=item.get("id")
    url=item.get("source_url")
    if not isinstance(ident,str) or not isinstance(url,str):
        return False
    match=re.fullmatch(r"(\d{14})-\d+-(\d+)/(\d{4})", ident)
    if not match:return False
    expected="https://pncp.gov.br/app/editais/%s/%s/%s" % (match.group(1),match.group(3),int(match.group(2)))
    return url in (expected,expected+"/") and URL.fullmatch(url) is not None

def build_preview(snapshot, profile, delivered_ids=(), *, now=None):
    """Return a private, consent/entitlement-gated *candidate*, not an email."""
    now=now or datetime.now(timezone.utc)
    if not isinstance(now,datetime) or now.tzinfo is None:
        raise ValueError("Timezone-aware clock required")
    if not isinstance(profile,dict) or not profile.get("consent") or profile.get("entitlement")!="active":
        return {"status":"NOT_ELIGIBLE","items":[],"notice":"No verified opt-in and active entitlement; never deliver."}
    stamp=parse_date(snapshot.get("generated_at")) if isinstance(snapshot,dict) else None
    if (not stamp or not timedelta(0)<=now-stamp<=MAX_AGE or
        not isinstance(snapshot.get("opportunities"),list) or snapshot.get("brand")!="Editalume"):
        return {"status":"STALE_OR_INVALID","items":[],"notice":"Last verified index unavailable or older than 36 hours; no digest."}
    cities={norm(x) for x in profile.get("cities",[]) if isinstance(x,str) and x.strip()}
    keys=[norm(x) for x in profile.get("keywords",[]) if isinstance(x,str) and x.strip()]
    focus=bool(profile.get("focus_only",False))
    previously={x for x in delivered_ids if isinstance(x,str)}
    unique=set()
    candidates=[]
    for item in snapshot["opportunities"]:
        if not isinstance(item,dict) or not canonical(item) or item["id"] in previously or item["id"] in unique:continue
        if item.get("uf")!="SP":continue
        # Carried-forward records are NOT evidence of a new opportunity.
        if item.get("last_seen_at")!=snapshot["generated_at"]:continue
        close=parse_date(item.get("deadline"))
        if close is None or close-now<MIN_RESPONSE_TIME:continue
        if focus and not item.get("sector_focus"):continue
        if cities and norm(item.get("city")) not in cities:continue
        text=norm(str(item.get("object",""))+" "+str(item.get("organ","")))
        if keys and not any(k in text for k in keys):continue
        unique.add(item["id"]);candidates.append(item)
    candidates.sort(key=lambda x:(x["deadline"],-int(x.get("relevance") or 0)))
    result=candidates[:MAX_RESULTS]
    warning="Consulta AMOSTRAL e PARCIAL; confirmações, alterações e prazo somente no edital oficial." if snapshot.get("partial") else "Consulta AMOSTRAL; confira prazo, elegibilidade e edital na fonte oficial."
    body=["Editalume | prévia do resumo de oportunidades",warning,
          "Não representa garantias de participação ou contratos.",""]
    for item in result:
        body.extend((str(item.get("object",""))[:350],
                     "Local: "+str(item.get("city",""))+"/SP",
                     "Prazo informado: "+str(item["deadline"]),
                     "Fonte oficial: "+str(item["source_url"]),""))
    return {"status":"PREVIEW_ONLY","items":result,
            "subject":"Editalume | "+str(len(result))+" oportunidades na sua seleção",
            "body":"\n".join(body),
            "new_ids":[x["id"] for x in result],
            "notice":warning,
            "send_enabled":False}

def main():
    parser=argparse.ArgumentParser(description="Offline, non-sending Premium candidate preview")
    parser.add_argument("--index",type=Path,default=Path("public/radar/search-index.json"))
    args=parser.parse_args()
    snap=json.loads(args.index.read_text(encoding="utf-8"))
    # Fixed fictional profile, never actual customer data.
    demo={"consent":True,"entitlement":"active","cities":[],
          "keywords":[],"focus_only":True}
    result=build_preview(snap,demo)
    print(json.dumps({"mode":"ANONYMOUS_DRY_RUN","status":result["status"],
                      "candidate_count":len(result["items"]),
                      "public_ids":[x["id"] for x in result["items"]],
                      "notice":result["notice"],"sent":False},ensure_ascii=False))

if __name__=="__main__":main()
