import unittest
from datetime import datetime,timedelta,timezone
from urllib.error import HTTPError
from urllib.parse import parse_qs,urlsplit

from national_batch import STATES,choose_uf,collect
NOW=datetime(2026,9,29,16,tzinfo=timezone.utc)

def coverage():
    return [{"uf":uf,"status":"not_started","last_attempt_at":None,"last_http_status":None}
            for uf in sorted(STATES)]

def fake(uf="RJ",ident="00000000000000-1-000001/2026",title="Manutenção predial"):
    return {"numeroControlePNCP":ident,"objetoCompra":title,
            "unidadeOrgao":{"ufSigla":uf,"municipioNome":"Niterói"},
            "orgaoEntidade":{"razaoSocial":"Órgão de teste"},
            "anoCompra":2026,"sequencialCompra":1,"modalidadeNome":"Pregão eletrônico",
            "dataEncerramentoProposta":(NOW+timedelta(days=15)).isoformat(),
            "valorTotalEstimado":3000}

class NationalTests(unittest.TestCase):
    def test_choose_unvisited_alphabetically(self):
        self.assertEqual(choose_uf(coverage(),NOW),"AC")
        rows=coverage()
        rows[0]["last_attempt_at"]=(NOW-timedelta(hours=1)).isoformat()
        self.assertEqual(choose_uf(rows,NOW),"AL")
    def test_never_scan_other_state_immediately_after_429(self):
        rows=coverage()
        rows[0].update(status="rate_limited",last_http_status=429,
                       last_attempt_at=(NOW-timedelta(hours=2)).isoformat())
        self.assertIsNone(choose_uf(rows,NOW))
        rows[0]["last_attempt_at"]=(NOW-timedelta(hours=7)).isoformat()
        self.assertEqual(choose_uf(rows,NOW),"AL")
    def test_reject_incomplete_coverage_registry(self):
        with self.assertRaises(ValueError):
            choose_uf(coverage()[:-1],NOW)
    def test_one_uf_bounded_page_counts_and_source_link(self):
        urls=[]
        def get(url):
            urls.append(url)
            q=parse_qs(urlsplit(url).query)
            self.assertEqual(q["uf"],["RJ"])
            self.assertEqual(q["tamanhoPagina"],["50"])
            return {"data":[fake()]} # one page for each modality
        result=collect("RJ",now=NOW,requester=get)
        self.assertEqual(len(urls),3)
        self.assertEqual(result["status"],"complete_sample")
        self.assertEqual(result["pages_examined"],3)
        self.assertEqual(result["records_examined"],3)
        self.assertEqual(len(result["opportunities"]),1)
        self.assertEqual(result["opportunities"][0]["source_url"],
                         "https://pncp.gov.br/app/editais/00000000000000/2026/1")
        self.assertEqual(result["opportunities"][0]["uf"],"RJ")
    def test_429_first_page_does_not_try_other_modality(self):
        seen=[]
        def reject(url):
            seen.append(url)
            raise HTTPError(url,429,"rate limited",{},None)
        report=collect("PR",now=NOW,requester=reject)
        self.assertEqual(len(seen),1)
        self.assertEqual(report["status"],"rate_limited")
        self.assertEqual(report["pages_examined"],0)
        self.assertEqual(report["last_http_status"],429)
    def test_429_after_first_page_is_partial_not_unverified_rate_limited(self):
        seen=[]
        def page(url):
            seen.append(url)
            return {"data":[fake(uf="SC") for _ in range(50)]} if len(seen)==1 else (
                (_ for _ in ()).throw(HTTPError(url,429,"rate limited",{},None)))
        report=collect("SC",now=NOW,requester=page)
        self.assertEqual(len(seen),2)
        self.assertEqual(report["pages_examined"],1)
        self.assertEqual(report["status"],"partial")
        self.assertEqual(report["last_http_status"],429)
    def test_inconsistent_id_not_imported(self):
        row=fake(ident="00000000000000-1-000002/2026")
        def get(url):
            return {"data":[row]}
        report=collect("RJ",now=NOW,requester=get)
        self.assertEqual(report["opportunities"],[])

if __name__=="__main__":unittest.main()
