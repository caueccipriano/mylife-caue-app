import unittest
from urllib.error import HTTPError
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from collector import collect, eligible, relevance, catalog_record
NOW=datetime(2026,9,29,10,tzinfo=ZoneInfo("America/Sao_Paulo"))
def item(desc="SERVIÇOS DE MANUTENÇÃO PREDIAL",uf="SP",deadline=None):
    return {"numeroControlePNCP":"00000000000000-1-000001/2026",
            "objetoCompra":desc,"unidadeOrgao":{"ufSigla":uf,"municipioNome":"Campinas"},
            "orgaoEntidade":{"razaoSocial":"Órgão de teste"},
            "anoCompra":2026,"sequencialCompra":1,
            "dataEncerramentoProposta":deadline or (NOW+timedelta(days=10)).isoformat(),
            "valorTotalEstimado":1234.5}
class CollectorTests(unittest.TestCase):
    def test_relevance_and_location(self):
        self.assertGreater(relevance("Manutenção elétrica predial"),0)
        self.assertEqual(relevance("Medicamentos hospitalares"),0)
        self.assertIsNone(eligible(item(uf="RJ"),NOW))
    def test_no_sales_on_medical_refrigerators_or_appliance_supply(self):
        self.assertEqual(relevance("Câmara para conservação de imunobiológicos"),0)
        self.assertEqual(relevance("Contratação de empresa para fornecimento de aparelhos de ar condicionado e refrigerador"),0)
        self.assertGreater(relevance("Contratação de empresa especializada para prestação de serviços de limpeza e conservação predial"),0)
        self.assertEqual(relevance("Aquisição de materiais para pintura e manutenção predial"),0)

    def test_exclude_explicitly_suspended_bids(self):
        suspended=item()
        suspended["situacaoCompraNome"]="SUSPENSA"
        self.assertIsNone(catalog_record(suspended,NOW))
        title=item(desc="SERVIÇOS DE LIMPEZA PREDIAL (SUSPENSA)")
        self.assertIsNone(catalog_record(title,NOW))

    def test_closed_bids_excluded(self):
        self.assertIsNone(eligible(item(deadline=(NOW-timedelta(days=1)).isoformat()),NOW))
        self.assertIsNone(eligible(item(deadline="not a date"),NOW))
    def test_missing_ids_and_values_are_not_invented(self):
        x=item()
        x["numeroControlePNCP"]="invalid"
        self.assertIsNone(eligible(x,NOW))
        x=item()
        x["valorTotalEstimado"]=0
        self.assertIsNone(eligible(x,NOW)["estimated_value_brl"])
    def test_partial_pagination_and_dedupe(self):
        def downloader(url):
            if "codigoModalidadeContratacao=8" in url:
                raise TimeoutError()
            return {"data":[item(),item()]}
        report=collect(now=NOW,downloader=downloader,max_pages=3)
        self.assertEqual(len(report["opportunities"]),1)
        self.assertEqual(len(report["catalog"]),1)
        self.assertEqual(report["catalog_count"],1)
        self.assertEqual(report["focus_count"],1)
        self.assertEqual(report["status"],"partial")
        self.assertFalse(report["exhaustive"])
        self.assertEqual(report["pages_examined"],1)
    def test_general_database_keeps_valid_non_focus_not_as_focus(self):
        generic=item(desc="COMPRA DE PAPEL DE IMPRESSORA")
        self.assertIsNone(eligible(generic,NOW))
        self.assertEqual(catalog_record(generic,NOW)["sector_focus"],False)
        report=collect(now=NOW, modalities=(6,),max_pages=1,downloader=lambda _:{"data":[item(),generic]})
        # Both have same synthetic ID, so replace second with a unique ID.
        self.assertEqual(report["catalog_count"],1)

    def test_different_valid_ids_and_searchable_general_catalog(self):
        generic=item(desc="COMPRA DE PAPEL DE IMPRESSORA")
        generic["numeroControlePNCP"]="00000000000001-1-000002/2026"
        generic["sequencialCompra"]=2
        report=collect(now=NOW, modalities=(6,),max_pages=1,downloader=lambda _:{"data":[item(),generic]})
        self.assertEqual(report["catalog_count"],2)
        self.assertEqual(report["focus_count"],1)
        self.assertEqual(len(report["opportunities"]),1)
        self.assertFalse(report["exhaustive"])

    def test_429_stops_collection_without_erasing_valid_sample(self):
        calls=[]
        def downloader(url):
            calls.append(url)
            if "pagina=1" in url:
                return {"data":[item() for _ in range(50)]}
            raise HTTPError(url,429,"Too Many Requests",{},None)
        report=collect(now=NOW,downloader=downloader,modalities=(6,8),max_pages=3)
        self.assertEqual(len(calls),2)
        self.assertEqual(report["pages_examined"],1)
        self.assertTrue(report["rate_limited"])
        self.assertEqual(report["status"],"partial")
        self.assertIn("HTTP 429",report["errors"][0])
        self.assertEqual(report["catalog_count"],1)

    def test_total_api_failure_does_not_fake_empty_feed(self):
        with self.assertRaises(RuntimeError):
            collect(now=NOW,downloader=lambda url: (_ for _ in ()).throw(TimeoutError()))
if __name__=="__main__":unittest.main()
