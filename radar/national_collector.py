"""Editalume: bounded national PNCP discovery, OIDC-authenticated Supabase sync.

Every run scans three UFs and only one page per modality (6 and 8).
At this cadence 27 UFs rotate across successive three-hour runs. Data is always
a partial sample, and states without successful queries stay explicitly pending.
No static credentials or private customer data are stored in this repository.
"""
from __future__ import annotations
import argparse
import json
import os
import time
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from collector import ALL_UFS, SP, PAGE_SIZE, catalog_record, request_page

UFS="AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split()
MODALITIES=(6,8)
AUDIENCE="editalume-national-sync-v1"
TARGET="https://jhxhbgprjqppzfrjdfvj.supabase.co/functions/v1/editalume-ingest"

def rotation(now=None):
    """Exactly three distinct UFs per 3-hour slot; covers 27 in nine slots."""
    now=(now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    slot=int(now.timestamp()//10800)
    start=(slot*3)%len(UFS)
    return [UFS[(start+i)%len(UFS)] for i in range(3)]

def parse_requested(value):
    if not value:
        return None
    items=[x.strip().upper() for x in value.split(",") if x.strip()]
    if not 1<=len(items)<=3 or len(set(items))!=len(items) or any(x not in ALL_UFS for x in items):
        raise ValueError("Provide 1 to 3 distinct two-letter Brazilian UFs")
    return items

def sample_state(uf,*,now=None,downloader=None,sleeper=time.sleep):
    if uf not in ALL_UFS:
        raise ValueError("Invalid UF")
    now=now or datetime.now(SP)
    if now.tzinfo is None:
        raise ValueError("Timezone-aware time required")
    now=now.astimezone(SP)
    end=now+timedelta(days=45)
    records={}
    examined=pages=0
    failed=False
    capped=False
    rate_limited=False
    http_status=None
    for index,mod in enumerate(MODALITIES):
        if index and downloader is None:
            sleeper(2.5)
        try:
            # Explicit UF, proven public modalities, at most one page each.
            response=request_page(end,mod,1,downloader=downloader,uf=uf)
            if not isinstance(response,dict) or not isinstance(response.get("data"),list):
                raise ValueError("Invalid public PNCP response")
            rows=response["data"]
        except (HTTPError,TimeoutError,URLError,ValueError) as exc:
            code=exc.code if isinstance(exc,HTTPError) else None
            if code is not None:
                http_status=code
            rate_limited=rate_limited or code==429
            failed=True
            if rate_limited:
                break
            continue
        pages+=1
        examined+=len(rows)
        if len(rows)>=PAGE_SIZE:
            capped=True
        for entry in rows:
            row=catalog_record(entry,now,expected_uf=uf)
            if not row or row["city"]=="Município não informado":
                continue
            row["first_seen_at"]=now.isoformat()
            row["last_seen_at"]=now.isoformat()
            records[row["id"]]=row
    status=("rate_limited" if rate_limited and pages==0 else
            "failed" if failed and pages==0 else
            "partial" if failed or capped else "complete_sample")
    return {"uf":uf,"attempted_at":now.isoformat(),"status":status,
            "records_examined":examined,"pages_examined":pages,
            "last_http_status":http_status,"opportunities":list(records.values())}

def github_oidc():
    url=os.getenv("ACTIONS_ID_TOKEN_REQUEST_URL")
    token=os.getenv("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not url or not token:
        raise RuntimeError("GitHub OIDC is not available: refuse upload")
    glue="&" if "?" in url else "?"
    address=url+glue+urlencode({"audience":AUDIENCE})
    req=Request(address,headers={"Authorization":"bearer "+token,"Accept":"application/json"})
    with urlopen(req,timeout=12) as response:
        result=json.load(response)
    value=result.get("value")
    if not isinstance(value,str) or not value:
        raise RuntimeError("No OIDC token received")
    return value

def upload(report,identity):
    body=json.dumps(report,ensure_ascii=False,separators=(",",":")).encode("utf-8")
    if len(body)>360000:
        raise RuntimeError("Validated state batch exceeds security bound")
    req=Request(TARGET,data=body,method="POST",headers={
        "Authorization":"Bearer "+identity,
        "Accept":"application/json","Content-Type":"application/json"})
    with urlopen(req,timeout=42) as response:
        result=json.load(response)
    if not isinstance(result,dict) or result.get("ok") is not True or result.get("uf")!=report["uf"]:
        raise RuntimeError("Supabase did not acknowledge state ingestion")
    if result.get("accepted")!=len(report["opportunities"]):
        raise RuntimeError("Supabase accepted count differs from validated data")
    return result

def main():
    parser=argparse.ArgumentParser(description="Editalume rotating 27-UF public PNCP collection")
    parser.add_argument("--states",default=os.getenv("REQUESTED_UFS") or "",
                        help="Optional 1–3 comma-separated UFs for authorized manual runs")
    parser.add_argument("--offline-check",action="store_true",help="Validate rotation without network")
    args=parser.parse_args()
    requested=parse_requested(args.states)
    if args.offline_check:
        selected=requested or rotation()
        print(json.dumps({"selected":selected,"scheduled_rotation":rotation()}))
        return
    identity=github_oidc()
    selected=requested or rotation()
    print("Editalume round: "+",".join(selected))
    for index,uf in enumerate(selected):
        if index:
            time.sleep(3)
        result=sample_state(uf)
        # All reports, including throttling with zero records, carry honest
        # per-UF diagnostics. The public site never infers complete coverage.
        ack=upload(result,identity)
        print(json.dumps({"uf":uf,"status":result["status"],"pages":result["pages_examined"],
                          "examined":result["records_examined"],"accepted":ack["accepted"],
                          "http_status":result["last_http_status"]},ensure_ascii=False))
        if result["status"]=="rate_limited" or result["last_http_status"]==429:
            print("PNCP throttled: stop this entire rotation without further API traffic.")
            break

if __name__=="__main__":
    main()
