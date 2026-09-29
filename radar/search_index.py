"""Indexed, cumulative active PNCP opportunities. Public data; no credential requirement.

EXPLICIT LIMITATION: bounded pagination per modality and region means this
index is a sampled catalogue, not a complete list of Brazilian procurement.
Everything stays read-only. Existing valid records retain last_seen_at, but may
change at PNCP: buyers must verify every official notice themselves.
"""
from __future__ import annotations
import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from collector import SP, normalize, catalog_record, request_page, PAGE_SIZE

MODALITIES=(4,6,8) # Public PNCP: concorrência eletrônica, pregão eletrônico, dispensa
MAX_PAGES=14
MAX_ACTIVE=5000
TEMPORARY_FAILURES=(429,500,502,503,504)

def valid_prior(row,now):
    if not isinstance(row,dict) or not isinstance(row.get("id"),str):
        return False
    if not re.fullmatch(r"\d{14}-\d+-\d+/\d{4}",row["id"]):
        return False
    if not isinstance(row.get("source_url"),str) or not row["source_url"].startswith("https://pncp.gov.br/app/editais/"):
        return False
    if row.get("uf") != "SP":
        return False
    try:
        end=datetime.fromisoformat(row["deadline"].replace("Z","+00:00"))
        if end.tzinfo is None: return False
    except (ValueError,KeyError,AttributeError):
        return False
    return end.astimezone(SP)>now

def prior_index(path,now):
    if not path.exists():return {}
    try:doc=json.loads(path.read_text(encoding="utf-8"))
    except (OSError,ValueError):return {}
    if not isinstance(doc,dict) or not isinstance(doc.get("opportunities"),list):return {}
    return {x["id"]:x for x in doc["opportunities"] if valid_prior(x,now)}

def load_page(end,modality,page,requester=None):
    if requester:return requester(end,modality,page)
    for attempt in range(3):
        try:return request_page(end,modality,page)
        except HTTPError as exc:
            if exc.code not in TEMPORARY_FAILURES or attempt==2:raise
            time.sleep(1.3*(attempt+1))
        except (TimeoutError,URLError):
            if attempt==2:raise
            time.sleep(1.3*(attempt+1))
    raise RuntimeError("Exhausted retries")

def verified_recent_sample(path, now):
    """Use ONLY a validated PNCP sample collected in the past 30 minutes.
    This avoids repeated PNCP traffic after API throttling, without claiming
    prior indexed records were individually rechecked.
    """
    from datetime import timedelta
    if not path.exists():
        return {}
    try:
        doc=json.loads(path.read_text(encoding="utf-8"))
        stamp=datetime.fromisoformat(doc["generated_at"].replace("Z","+00:00"))
    except (OSError,ValueError,TypeError,KeyError,AttributeError):
        return {}
    if not isinstance(doc,dict) or doc.get("brand")!="Editalume" or doc.get("status") not in ("sample_ok","partial") or stamp.tzinfo is None or not timedelta(0)<=now-stamp.astimezone(SP)<=timedelta(minutes=30):
        return {}
    items=doc.get("opportunities")
    if not isinstance(items,list):
        return {}
    return {item["id"]:dict(item) for item in items if valid_prior(item,now)}

def build(*,now=None,prior=None,requester=None,modalities=MODALITIES,max_pages=MAX_PAGES,verified_sample=None):
    now=(now or datetime.now(SP)).astimezone(SP)
    from datetime import timedelta
    end=now+timedelta(days=45)
    found={k:dict(v) for k,v in (prior or {}).items() if valid_prior(v,now)}
    sample={k:dict(v) for k,v in (verified_sample or {}).items() if valid_prior(v,now)}
    for k,row in sample.items():
        row["first_seen_at"]=found.get(k,{}).get("first_seen_at",now.isoformat())
        row["last_seen_at"]=now.isoformat()
        found[k]=row
    pages=records=0
    errs=[]
    seen=set()
    capped=[]
    for mod in modalities:
        reached_cap=True
        for page in range(1,max_pages+1):
            try:
                payload=load_page(end,mod,page,requester=requester)
                if not isinstance(payload,dict) or not isinstance(payload.get("data"),list):
                    raise ValueError("Unrecognized PNCP response")
            except Exception as exc:
                errs.append(f"modalidade {mod}, página {page}: {type(exc).__name__}")
                reached_cap=False
                break
            rows=payload["data"]
            pages+=1; records+=len(rows)
            for item in rows:
                rec=catalog_record(item,now)
                if not rec:continue
                key=rec["id"]
                rec["first_seen_at"]=found.get(key,{}).get("first_seen_at",now.isoformat())
                rec["last_seen_at"]=now.isoformat()
                found[key]=rec
                seen.add(key)
            if len(rows)<PAGE_SIZE:
                reached_cap=False
                break
            if requester is None:time.sleep(.8)
        if reached_cap:capped.append(mod)
    if pages==0 and not sample:
        raise RuntimeError("All PNCP requests failed and no verified recent sample; retaining old index")
    sample_fallback=bool(pages==0 and sample)
    if sample_fallback:
        errs.append("Index API unavailable; only recent independently fetched PNCP sample has been revalidated")
    data=sorted(found.values(),key=lambda x:(x["deadline"],-int(x.get("relevance",0))))[:MAX_ACTIVE]
    # Keep actual data only. Do NOT pretend records still unexpired are confirmed
    # if the daily discovery feed failed or ceased including them.
    return {"brand":"Editalume","format_version":2,"generated_at":now.isoformat(),
            "coverage":"amostra indexada de contratações públicas de múltiplos setores em SP, com prazo registrado no futuro",
            "exhaustive":False,"region":"São Paulo","modalities":list(modalities),
            "max_pages_per_modality":max_pages,"pagination_limit_hit_for":capped,
            "pages_fetched_this_run":pages,"records_examined_this_run":records,
            "new_or_reobserved_count":len(seen),"indexed_open_by_recorded_deadline":len(data),
            "observed_this_run":sum(1 for r in data if r.get("last_seen_at")==now.isoformat()),
            "carried_forward_unreconfirmed":sum(1 for r in data if r.get("last_seen_at")!=now.isoformat()),
            "focus_count":sum(1 for r in data if r.get("sector_focus")),
            "partial":bool(errs or capped or sample_fallback),"errors":errs,
            "sample_fallback":sample_fallback,"verified_sample_items":len(sample),
            "notice":"Índice amostral. Registros guardados entre coletas podem mudar ou ser cancelados sem atualização. A data acima não representa verificação individual de todos os editais; verifique condições, validade e prazo nas fontes oficiais.",
            "opportunities":data}

def main():
    p=argparse.ArgumentParser(description="Bounded indexed public PNCP discovery")
    p.add_argument("--output",type=Path,default=Path("public/radar/search-index.json"))
    args=p.parse_args()
    now=datetime.now(SP)
    old=prior_index(args.output,now)
    # One-time compatible seed from previously verified public feed
    seed=Path("public/radar/opportunities.json")
    if not old and seed.exists():
        old=prior_index(seed,now)
    # Reuse the independently fetched, recent PNCP sample if secondary API
    # queries are throttled; retain explicit partial/fallback metadata.
    verified=verified_recent_sample(seed,now)
    data=build(now=now,prior=old,verified_sample=verified)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    temp=args.output.with_suffix(".tmp")
    temp.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    temp.replace(args.output)
    print(json.dumps({"sampled":data["records_examined_this_run"],
                     "indexed":len(data["opportunities"]),"partial":data["partial"],
                     "errors":data["errors"]},ensure_ascii=False))
if __name__=="__main__":main()
