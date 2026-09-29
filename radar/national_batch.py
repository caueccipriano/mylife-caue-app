"""Bounded nationwide PNCP rotation. Public reads; writes require GitHub OIDC Edge auth.

One UF per job, up to two pages for each supported modality. This does not
claim completeness. A recent 429 holds all states for six hours, without
falsifying the timestamps of older data.
"""
from __future__ import annotations
import argparse
import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from collector import catalog_record, request_page, PAGE_SIZE

STATES = frozenset("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split())
API = "https://jhxhbgprjqppzfrjdfvj.supabase.co/rest/v1/editalume_uf_coverage"
KEY = "sb_publishable_O85v7HRJg7br9kxUbvticw_NNO8jp4w"  # Public read-only key; RLS enforced.
MODALITIES = (4, 6, 8)
MAX_PAGES = 2
MAX_BATCH = 100
SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def parse_stamp(value):
    try:
        stamp = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return stamp.astimezone(timezone.utc) if stamp.tzinfo is not None else None
    except (ValueError, TypeError, AttributeError):
        return None


def choose_uf(coverage, now):
    """Choose an untouched UF first, then the least recently attempted one.

    Do not hammer another state when the last statewide request got HTTP 429.
    """
    if not isinstance(coverage, list):
        raise ValueError("Coverage query was not a list")
    rows = [r for r in coverage if isinstance(r, dict) and r.get("uf") in STATES]
    if set(r["uf"] for r in rows) != STATES or len(rows) != len(STATES):
        raise ValueError("The 27-state registry is missing or duplicated")
    last_limits = [
        parse_stamp(r.get("last_attempt_at"))
        for r in rows if r.get("status") == "rate_limited" and r.get("last_http_status") == 429
    ]
    if any(stamp and timedelta(0) <= now - stamp < timedelta(hours=6) for stamp in last_limits):
        return None
    return min(rows, key=lambda r: (parse_stamp(r.get("last_attempt_at")) or
                                    datetime(1970, 1, 1, tzinfo=timezone.utc),
                                    r["uf"]))["uf"]


def load_coverage():
    request = Request(API + "?select=uf,status,last_attempt_at,last_http_status",
                      headers={"Accept": "application/json", "apikey": KEY,
                               "User-Agent": "EditalumeResearch/2.1 (public coverage)"})
    with urlopen(request, timeout=18) as response:
        coverage = json.load(response)
    if not isinstance(coverage, list):
        raise RuntimeError("The public coverage API returned malformed data")
    return coverage


def collect(uf, *, now, requester=None, pause=None, max_pages=MAX_PAGES):
    if uf not in STATES or now.tzinfo is None:
        raise ValueError("A valid UF and timezone-aware timestamp are required")
    if max_pages < 1 or max_pages > 2:
        raise ValueError("Bounded paging requires one or two pages per modality")
    now = now.astimezone(SAO_PAULO)
    end = now + timedelta(days=45)
    sent = {}
    pages = records = 0
    partial = limited = False
    status_code = None
    for mod in MODALITIES:
        for page in range(1, max_pages + 1):
            try:
                response = request_page(end, mod, page, uf=uf,
                                        downloader=requester) if requester else request_page(
                                            end, mod, page, uf=uf)
                if not isinstance(response, dict) or not isinstance(response.get("data"), list):
                    raise ValueError("Invalid PNCP page")
            except HTTPError as error:
                status_code = error.code
                limited = error.code == 429
                partial = True
                break
            except (URLError, TimeoutError, ValueError):
                partial = True
                break
            rows = response["data"]
            pages += 1
            records += len(rows)
            for raw in rows:
                item = catalog_record(raw, now, uf=uf)
                if item is not None:
                    sent[item["id"]] = item
            if len(rows) < PAGE_SIZE:
                break
            if page == max_pages:
                partial = True
            if pause:
                pause(0.9)
        if partial and (limited or pages == 0 or status_code is not None):
            break
    result = sorted(sent.values(), key=lambda row: (row["deadline"], -row["relevance"]))[:MAX_BATCH]
    status = ("rate_limited" if limited and pages == 0 else
              "failed" if pages == 0 else
              "partial" if partial or len(sent) > MAX_BATCH else "complete_sample")
    stamped = now.astimezone(timezone.utc).isoformat()
    for row in result:
        row["first_seen_at"] = stamped
        row["last_seen_at"] = stamped
    return {
        "uf": uf, "attempted_at": stamped, "status": status,
        "pages_examined": pages, "records_examined": records,
        "last_http_status": status_code,
        "opportunities": result,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("/tmp/editalume-national.json"))
    parser.add_argument("--uf", choices=sorted(STATES), help="Optional explicit UF for a manual smoke run")
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    chosen = args.uf if args.uf else choose_uf(load_coverage(), now)
    report = {"skip": True, "reason": "Recent official PNCP HTTP 429"} if not chosen else collect(
        chosen, now=now, pause=time.sleep)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temp = args.output.with_suffix(".tmp")
    temp.write_text(json.dumps(report, ensure_ascii=False, separators=(",", ":")) + "\n",
                    encoding="utf-8")
    temp.replace(args.output)
    print(json.dumps({k: v for k, v in report.items() if k != "opportunities"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
