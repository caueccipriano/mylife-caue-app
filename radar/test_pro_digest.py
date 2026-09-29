"""Offline checks: no email, no personal data, no fabricated Premium entitlement."""
import unittest
from datetime import datetime,timedelta,timezone
from pro_digest import build_preview
NOW=datetime(2026,9,29,18,tzinfo=timezone.utc)
STAMP=(NOW-timedelta(minutes=7)).isoformat()
def record(serial=1,city="Campinas",desc="Prestação de serviços de limpeza predial",
           last_seen=STAMP,deadline=None):
    return {"id":f"00000000000000-1-{serial:06d}/2026",
        "source_url":f"https://pncp.gov.br/app/editais/00000000000000/2026/{serial}",
        "city":city,"uf":"SP","object":desc,"organ":"Prefeitura fictícia",
        "sector_focus":True,"relevance":2,"last_seen_at":last_seen,
        "deadline":(deadline or NOW+timedelta(days=7)).isoformat()}
def fixture(*rows,partial=False,stamp=STAMP):
    return {"brand":"Editalume","generated_at":stamp,"partial":partial,
            "opportunities":list(rows)}
def profile(**changes):
    return {"consent":True,"entitlement":"active",
            "cities":["Campinas"],"keywords":["limpeza"],"focus_only":True,**changes}
class DigestSafety(unittest.TestCase):
    def test_valid_filtered_dry_run_and_partial_warning(self):
        sample=fixture(record(),record(2,city="Santos"),record(3,desc="Compra de computadores"),partial=True)
        result=build_preview(sample,profile(),now=NOW)
        self.assertEqual(result["status"],"PREVIEW_ONLY")
        self.assertEqual(len(result["items"]),1)
        self.assertIn("PARCIAL",result["body"])
        self.assertFalse(result["send_enabled"])
    def test_consent_and_entitlement_required(self):
        doc=fixture(record())
        for p in ({"consent":False,"entitlement":"active"},
                  {"consent":True,"entitlement":"pending"},{}):
            result=build_preview(doc,p,now=NOW)
            self.assertEqual(result["status"],"NOT_ELIGIBLE")
            self.assertEqual(result["items"],[])
    def test_stale_index_no_delivery(self):
        old=(NOW-timedelta(days=2)).isoformat()
        result=build_preview(fixture(record(),stamp=old),profile(),now=NOW)
        self.assertEqual(result["status"],"STALE_OR_INVALID")
    def test_dedupe_prior_and_no_false_new_records(self):
        sample=fixture(record(1),record(1),record(2,last_seen=(NOW-timedelta(days=1)).isoformat()),record(3))
        result=build_preview(sample,profile(),delivered_ids=[record(3)["id"]],now=NOW)
        self.assertEqual(result["new_ids"],[record(1)["id"]])
    def test_reject_link_spoof_or_soon_deadline(self):
        spoof={**record(1),"source_url":"https://pncp.gov.br/app/editais/00000000000000/2026/1?evil=1"}
        mismatched={**record(3),"source_url":"https://pncp.gov.br/app/editais/99999999999999/2026/3"}
        soon=record(2,deadline=NOW+timedelta(minutes=30))
        result=build_preview(fixture(spoof,mismatched,soon),profile(),now=NOW)
        self.assertEqual(result["items"],[])
    def test_safe_empty_snapshot_and_invalid_clock(self):
        result=build_preview(fixture(),profile(),now=NOW)
        self.assertEqual(result["items"],[])
        with self.assertRaises(ValueError):
            build_preview(fixture(),profile(),now=NOW.replace(tzinfo=None))
if __name__=="__main__":unittest.main()
