import unittest
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from search_index import build,valid_prior,prior_index,MAX_ACTIVE
NOW=datetime(2026,9,29,14,tzinfo=ZoneInfo("America/Sao_Paulo"))
def sample(desc="Prestação de serviços de limpeza predial",future_days=10):
    return {"numeroControlePNCP":"00000000000000-1-000001/2026","objetoCompra":desc,
            "unidadeOrgao":{"ufSigla":"SP","municipioNome":"Campinas"},
            "orgaoEntidade":{"razaoSocial":"Órgão fictício de teste"},
            "dataEncerramentoProposta":(NOW+timedelta(days=future_days)).isoformat(),
            "anoCompra":2026,"sequencialCompra":1,"modalidadeNome":"Dispensa"}
class IndexTests(unittest.TestCase):
    def test_dedup_and_true_counts(self):
        def get(end,mod,page):return {"data":[sample(),sample()]}
        result=build(now=NOW,requester=get,modalities=(8,),max_pages=2)
        self.assertEqual(result["records_examined_this_run"],2)
        self.assertEqual(result["indexed_open_by_recorded_deadline"],1)
        self.assertFalse(result["exhaustive"])
    def test_general_sectors_really_appear_in_search_index(self):
        general=sample(desc="COMPRA DE PAPEL SULFITE PARA ESCRITÓRIO")
        general["numeroControlePNCP"]="00000000000001-1-000002/2026"
        general["sequencialCompra"]=2
        def get(end,mod,page):return {"data":[sample(),general]}
        report=build(now=NOW,requester=get,modalities=(8,),max_pages=1)
        self.assertEqual(report["indexed_open_by_recorded_deadline"],2)
        self.assertEqual(report["focus_count"],1)
        self.assertEqual(report["observed_this_run"],2)
        self.assertEqual(report["carried_forward_unreconfirmed"],0)
        self.assertFalse(report["exhaustive"])
        self.assertTrue(any(not r["sector_focus"] for r in report["opportunities"]))

    def test_failed_one_modality_is_disclosed(self):
        def get(end,mod,page):
            if mod==6:raise TimeoutError("simulated network fault")
            return {"data":[sample()]}
        report=build(now=NOW,requester=get,modalities=(6,8),max_pages=1)
        self.assertTrue(report["partial"])
        self.assertEqual(report["pages_fetched_this_run"],1)
        self.assertEqual(len(report["errors"]),1)
    def test_secondary_api_failure_uses_only_recent_verified_sample(self):
        item={"id":"00000000000000-1-000001/2026",
              "source_url":"https://pncp.gov.br/app/editais/00000000000000/2026/1",
              "deadline":(NOW+timedelta(days=9)).isoformat(),
              "uf":"SP","city":"Campinas","object":"Serviços prediais"}
        result=build(now=NOW,requester=lambda e,m,p:(_ for _ in ()).throw(TimeoutError()),
                     modalities=(6,8),max_pages=1,verified_sample={item["id"]:item},sample_records_examined=400)
        self.assertTrue(result["sample_fallback"])
        self.assertTrue(result["partial"])
        self.assertEqual(result["pages_fetched_this_run"],0)
        self.assertEqual(result["records_examined_this_run"],0)
        self.assertEqual(result["verified_sample_items"],1)
        self.assertEqual(result["verified_sample_records_examined"],400)
        self.assertEqual(result["observed_this_run"],1)
        self.assertFalse(result["exhaustive"])

    def test_stale_sample_must_never_refresh_index(self):
        import json,tempfile
        from pathlib import Path
        from search_index import verified_recent_sample
        from datetime import timedelta
        item={"id":"00000000000000-1-000001/2026",
              "source_url":"https://pncp.gov.br/app/editais/00000000000000/2026/1",
              "deadline":(NOW+timedelta(days=10)).isoformat(),"uf":"SP"}
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/"sample.json"
            p.write_text(json.dumps({"brand":"Editalume","status":"sample_ok",
                "generated_at":(NOW-timedelta(hours=2)).isoformat(),"opportunities":[item]}))
            self.assertEqual(verified_recent_sample(p,NOW),{})
            p.write_text(json.dumps({"brand":"Editalume","status":"sample_ok",
                "generated_at":(NOW-timedelta(minutes=2)).isoformat(),"opportunities":[item]}))
            self.assertEqual(len(verified_recent_sample(p,NOW)),1)

    def test_total_failure_preserves_existing_index(self):
        with self.assertRaises(RuntimeError):
            build(now=NOW,requester=lambda e,m,p:(_ for _ in ()).throw(TimeoutError()),
                  modalities=(8,),max_pages=1)
    def test_excludes_expired_and_wrong_provenance(self):
        prior={"id":"00000000000000-1-000001/2026","source_url":"https://pncp.gov.br/app/editais/00000000000000/2026/1",
               "uf":"SP","deadline":(NOW+timedelta(days=3)).isoformat()}
        self.assertTrue(valid_prior(prior,NOW))
        self.assertFalse(valid_prior({**prior,"deadline":(NOW-timedelta(days=1)).isoformat()},NOW))
        self.assertFalse(valid_prior({**prior,"source_url":"https://attacker.example.com/"},NOW))
    def test_capped_pagination_disclosed(self):
        def get(end,mod,page):return {"data":[sample() for _ in range(50)]}
        result=build(now=NOW,requester=get,modalities=(8,),max_pages=1)
        self.assertEqual(result["pagination_limit_hit_for"],[8])
        self.assertTrue(result["partial"])
        self.assertLessEqual(len(result["opportunities"]),MAX_ACTIVE)
if __name__=="__main__":unittest.main()
