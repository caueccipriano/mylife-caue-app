import unittest
from datetime import datetime,timedelta,timezone
from urllib.error import HTTPError
from http.client import RemoteDisconnected
from unittest.mock import patch
import national_collector
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
    batches=[rotation(first+timedelta(hours=3*i)) for i in range(9)]
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

 def test_remote_disconnect_retries_once_then_recovers_without_fake_partial(self):
    attempts=[]
    delays=[]
    def response(url):
      attempts.append(url)
      if len(attempts)==1:
       raise RemoteDisconnected("PNCP closed without response")
      return {"data":[notice("RJ")]}
    r=sample_state("RJ",now=NOW,downloader=response,sleeper=delays.append)
    self.assertEqual(r["status"],"complete_sample")
    self.assertEqual(r["pages_examined"],2)
    self.assertEqual(r["records_examined"],2)
    self.assertEqual(len(attempts),3)
    self.assertEqual(delays,[3])

 def test_persistent_remote_disconnect_generates_honest_failed_report(self):
    calls=[]
    def disconnect(url):
      calls.append(url)
      raise RemoteDisconnected("network dropped")
    r=sample_state("RJ",now=NOW,downloader=disconnect,sleeper=lambda _:None)
    self.assertEqual(r["status"],"failed")
    self.assertEqual(r["pages_examined"],0)
    self.assertEqual(r["records_examined"],0)
    self.assertEqual(r["opportunities"],[])
    self.assertEqual(len(calls),4)  # one retry per bounded modality

 def test_server_503_is_bounded_and_429_never_retried(self):
    calls=[]
    def response(url):
      calls.append(url)
      if len(calls)==1:
       raise HTTPError(url,503,"Service unavailable",{},None)
      if len(calls)==3:
       raise HTTPError(url,429,"Too many requests",{},None)
      return {"data":[notice("RJ")]}
    r=sample_state("RJ",now=NOW,downloader=response,sleeper=lambda _:None)
    self.assertEqual(len(calls),3)
    self.assertEqual(r["pages_examined"],1)
    self.assertEqual(r["status"],"partial")
    self.assertEqual(r["last_http_status"],429)

 def test_zero_verified_pages_flags_workflow_without_discarding_reports(self):
    failed={"uf":"RJ","status":"failed","pages_examined":0,"records_examined":0,
            "last_http_status":None,"opportunities":[]}
    uploaded=[]
    with (
         patch.object(national_collector,"github_oidc",return_value="synthetic"),
         patch.object(national_collector,"rotation",return_value=["RJ"]),
         patch.object(national_collector,"sample_state",return_value=failed),
         patch.object(national_collector,"upload",side_effect=lambda report,_id:
              uploaded.append(report) or {"accepted":0}),
         patch("sys.argv",["national_collector.py"]),
    ):
      with self.assertRaisesRegex(RuntimeError,"No validated PNCP page"):
       national_collector.main()
    self.assertEqual(len(uploaded),1)
if __name__=="__main__":unittest.main()
