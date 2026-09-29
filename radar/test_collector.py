import unittest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from collector import collect, eligible, relevance
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
        self.assertEqual(report["status"],"partial")
        self.assertFalse(report["exhaustive"])
        self.assertEqual(report["pages_examined"],1)
    def test_total_api_failure_does_not_fake_empty_feed(self):
        with self.assertRaises(RuntimeError):
            collect(now=NOW,downloader=lambda url: (_ for _ in ()).throw(TimeoutError()))
if __name__=="__main__":unittest.main()
