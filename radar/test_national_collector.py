import unittest
from datetime import datetime,timedelta,timezone
from urllib.error import HTTPError
from zoneinfo import ZoneInfo
from national_collector import UFS,rotation,parse_requested,sample_state
from collector import catalog_record
NOW=datetime(2026,9,29,16,0,tzinfo=ZoneInfo("America/Sao_Paulo"))
def notice(uf="RJ",desc="Prestação de serviços de limpeza predial",serial=1):
    return {"numeroControlePNCP":f"00000000000001-1-{serial:06d}/2026",
      "objetoCompra":desc,"unidadeOrgao":{"ufSigla":uf,"municipioNome":"Niterói"},
      "orgaoEntidade":{"razaoSocial":"Órgão sintético de teste"},
      "dataEncerramentoProposta":(NOW+timedelta(days=6)).isoformat(),
      "modalidadeNome":"Pregão eletrônico","anoCompra":2026,"sequencialCompra":serial,
      "valorTotalEstimado":2300.0}
class NationalTests(unittest.TestCase):
 def test_all_27_ufs_covered_in_nine_rotation_slots(self):
    first=datetime(2026,9,29,0,tzinfo=timezone.utc)
    batches=[rotation(first+timedelta(hours=6*i)) for i in range(9)]
    self.assertEqual(len(set(sum(batches,[]))),27)
    self.assertTrue(all(len(x)==3 and len(set(x))==3 for x in batches))
 def test_manual_selection_is_explicitly_bounded(self):
    self.assertEqual(parse_requested("ac, rj, sp"),["AC","RJ","SP"])
    self.assertIsNone(parse_requested(""))
    for bad in ("XX","AC,AC","SP,RJ,SC,AM","SP;rm -rf /",""):
      if bad:
       with self.assertRaises(ValueError):parse_requested(bad)
 def test_catalog_keeps_legacy_sp_default(self):
    self.assertIsNone(catalog_record(notice("RJ"),NOW))
    new=catalog_record(notice("RJ"),NOW,expected_uf="RJ")
    self.assertEqual(new["uf"],"RJ")
    self.assertIn("/2026/1",new["source_url"])
    self.assertIsNone(catalog_record(notice("SP"),NOW,expected_uf="RJ"))
 def test_correct_uf_encoded_and_no_cross_state_data(self):
    urls=[]
    def response(url):
      urls.append(url)
      return {"data":[notice("RJ"),notice("SP"),notice("RJ",serial=1)]}
    r=sample_state("RJ",now=NOW,downloader=response,sleeper=lambda _:None)
    self.assertEqual(r["status"],"complete_sample")
    self.assertEqual(r["pages_examined"],2)
    self.assertEqual(r["records_examined"],6)
    self.assertEqual(len(r["opportunities"]),1)
    self.assertTrue(all("uf=RJ" in x for x in urls))
 def test_throttling_stops_second_modality_and_rejects_fake_success(self):
    urls=[]
    def response(url):
      urls.append(url)
      raise HTTPError(url,429,"Too Many Requests",{},None)
    r=sample_state("AM",now=NOW,downloader=response,sleeper=lambda _:None)
    self.assertEqual(len(urls),1)
    self.assertEqual(r["status"],"rate_limited")
    self.assertEqual(r["pages_examined"],0)
    self.assertEqual(r["opportunities"],[])
    self.assertEqual(r["last_http_status"],429)
 def test_prior_success_and_subsequent_throttling_keeps_partial_state(self):
    calls=[]
    def response(url):
      calls.append(url)
      if len(calls)==1:return {"data":[notice("RJ")]}
      raise HTTPError(url,429,"Too Many Requests",{},None)
    r=sample_state("RJ",now=NOW,downloader=response,sleeper=lambda _:None)
    self.assertEqual(r["status"],"partial")
    self.assertEqual(r["pages_examined"],1)
    self.assertEqual(len(r["opportunities"]),1)
    self.assertEqual(r["last_http_status"],429)
 def test_page_cap_is_visible_and_never_exhaustive(self):
    calls=[]
    def response(url):
      calls.append(url)
      return {"data":[notice("BA",serial=i+1) for i in range(50)]}
    r=sample_state("BA",now=NOW,downloader=response,sleeper=lambda _:None)
    self.assertEqual(len(calls),2)
    self.assertEqual(r["status"],"partial")
    self.assertEqual(r["records_examined"],100)
    self.assertEqual(len(r["opportunities"]),50)
    self.assertTrue(all("uf=BA" in x for x in calls))
if __name__=="__main__":unittest.main()
