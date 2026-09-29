"""Editalume: cautious, read-only SAMPLE from the public PNCP proposals API.

This is a bounded discovery feed, NOT a complete or certified list of open bids.
No client records, passwords, email sending or authenticated operations.
"""
from __future__ import annotations
import argparse
import json
import re
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

API = "https://pncp.gov.br/api/consulta/v1/contratacoes/proposta"
SP = ZoneInfo("America/Sao_Paulo")
MODALITIES = (6, 8)  # Pregão eletrônico and dispensa, both checked via public PNCP
MAX_PAGES_PER_MODALITY = 12
PAGE_SIZE = 50
INCLUDE = ("manutenc", "ar condicionado", "climatiz", "refriger", "limpeza", "higieniz",
           "eletric", "hidraulic", "facilities", "predial", "jardinag", "conservac",
           "elevador", "bombeiro", "dedetiz", "portaria")
EXCLUDE = ("aquisição de medicamentos", "material hospitalar")

def normalize(value):
    t = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"\s+", " ", t).strip()

def relevance(description):
    text = normalize(description)
    if any(term in text for term in EXCLUDE):
        return 0
    # Prefer precision over recall: don't market purchases of cleaning supplies,
    # refrigerators, medical cold storage, etc. as maintenance SERVICE contracts.
    if any(w in text for w in ("imunobiologic", "vacina", "medicamento", "equipamento hospitalar")):
        return 0
    service_context = any(w in text for w in
                          ("prestacao de servic", "servico de", "servicos de",
                           "empresa especializada", "manutenc", "instalac",
                           "execuc", "reforma", "zeladoria"))
    if not service_context:
        return 0
    if any(w in text for w in ("aquisicao", "fornecimento")) and not any(
            w in text for w in ("prestacao de servic", "prestacao dos servic",
                               "servicos de", "servico de", "execucao de",
                               "execucao dos")):
        return 0
    return sum(1 for term in INCLUDE if term in text)

def as_datetime(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.replace(tzinfo=SP) if parsed.tzinfo is None else parsed.astimezone(SP)

def catalog_record(item, now):
    """One verified, currently open record in our bounded SP PNCP sample."""
    if not isinstance(item, dict):
        return None
    unit = item.get("unidadeOrgao")
    if not isinstance(unit, dict) or unit.get("ufSigla") != "SP":
        return None
    close = as_datetime(item.get("dataEncerramentoProposta"))
    if close is None or close <= now:
        return None
    desc = item.get("objetoCompra")
    if not isinstance(desc, str) or len(desc.strip()) < 8:
        return None
    ident = item.get("numeroControlePNCP")
    if not isinstance(ident, str) or not re.fullmatch(r"\d{14}-\d+-\d+/\d{4}", ident):
        return None
    cnpj = ident.split("-", 1)[0]
    year = item.get("anoCompra")
    serial = item.get("sequencialCompra")
    if not isinstance(year, int) or not isinstance(serial, int) or serial < 1:
        return None
    organ = item.get("orgaoEntidade") or {}
    if not isinstance(organ,dict):
        organ={}
    score=relevance(desc)
    return {
        "id":ident,"object":desc[:1200],
        "organ":str(organ.get("razaoSocial") or "Órgão não identificado")[:180],
        "city":str(unit.get("municipioNome") or "São Paulo")[:100],
        "uf":"SP","deadline":close.isoformat(),
        "modality":str(item.get("modalidadeNome") or "Verificar no PNCP")[:100],
        "estimated_value_brl":item.get("valorTotalEstimado") if isinstance(item.get("valorTotalEstimado"),(int,float)) and not isinstance(item.get("valorTotalEstimado"),bool) and 0 < item.get("valorTotalEstimado") < 1e15 else None,
        "source":"PNCP",
        "source_url":f"https://pncp.gov.br/app/editais/{cnpj}/{year}/{serial}",
        "relevance":score,"sector_focus":bool(score)
    }

def eligible(item, now):
    """Maintain backwards-compatible niche-only helper, fail closed."""
    record=catalog_record(item,now)
    return record if record and record["sector_focus"] else None


def request_page(end, modality, page, *, downloader=None):
    query=urlencode({"dataFinal":end.strftime("%Y%m%d"),
                     "codigoModalidadeContratacao":modality,"uf":"SP",
                     "pagina":page,"tamanhoPagina":PAGE_SIZE})
    url=API+"?"+query
    if downloader is not None:
        return downloader(url)
    req=Request(url,headers={"Accept":"application/json",
                              "User-Agent":"EditalumeResearch/0.1 (+public PNCP feed)"})
    with urlopen(req,timeout=35) as res:
        payload=json.load(res)
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        raise ValueError("PNCP returned unexpected schema")
    return payload

def collect(*, now=None, downloader=None, modalities=MODALITIES, max_pages=MAX_PAGES_PER_MODALITY):
    now=now or datetime.now(SP)
    if now.tzinfo is None: raise ValueError("An aware timestamp is required")
    now=now.astimezone(SP)
    end=now+timedelta(days=45)
    found={}
    errors=[]
    scanned=0
    pages=0
    for modality in modalities:
        for page in range(1,max_pages+1):
            try:
                batch=request_page(end,modality,page,downloader=downloader)
                if not isinstance(batch,dict) or not isinstance(batch.get("data"),list):
                    raise ValueError("PNCP returned unexpected schema")
            except Exception as exc:
                errors.append(f"modality={modality},page={page}: {type(exc).__name__}")
                break
            rows=batch["data"]
            pages+=1
            scanned+=len(rows)
            for item in rows:
                row=catalog_record(item,now)
                if row is not None:
                    found[row["id"]]=row
            if not rows or len(rows)<PAGE_SIZE:
                break
            # Rate limiting: bounded and intentionally gentle against official API.
            if downloader is None: time.sleep(0.6)
    if pages==0:
        raise RuntimeError("No validated PNCP page received; retaining last valid public report")
    sorted_rows=sorted(found.values(),key=lambda row:(row["deadline"],-row["relevance"]))
    focus_rows=sorted((r for r in found.values() if r["sector_focus"]), key=lambda row:(-row["relevance"],row["deadline"]))
    return {
        "brand":"Editalume","generated_at":now.isoformat(),
        "status":"partial" if errors else "sample_ok","region":"SP",
        "niche":"manutenção, conservação e serviços prediais",
        "covered_modalities":list(modalities),
        "sample_limit_pages_per_modality":max_pages,
        "pages_examined":pages,"records_examined":scanned,
        "catalog_count":len(sorted_rows),"focus_count":len(focus_rows),
        "coverage_note":"SP; apenas modalidades 6 e 8; até 12 páginas por modalidade; propostas com data final informada nos próximos 45 dias; não inclui todo o PNCP.",
        "exhaustive":False,
        "notice":"Amostra parcial e automatizada. Não representa todas as licitações. Consulte o edital oficial e confirme prazos, elegibilidade e eventuais alterações antes de qualquer proposta.",
        "errors":errors,"opportunities":focus_rows,
        "catalog":sorted_rows
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,default=Path("public/radar/opportunities.json"))
    args=ap.parse_args()
    report=collect()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    temp=args.output.with_suffix(".json.tmp")
    temp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    temp.replace(args.output)
    print(f"PNCP SAMPLE pages={report['pages_examined']} examined={report['records_examined']} matched={len(report['opportunities'])} status={report['status']}")

if __name__=="__main__":main()
