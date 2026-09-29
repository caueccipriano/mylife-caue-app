"""Offline Premium multi-profile QA; fictitious procurement records only."""
import unittest
from datetime import datetime, timedelta, timezone
from premium_profiles import build_multi_profile_preview, validate_profiles

NOW = datetime(2026, 9, 29, 18, tzinfo=timezone.utc)
STAMP = (NOW - timedelta(minutes=2)).isoformat()
GATE = {"subscription_status": "active", "digest_opt_in": True}


def row(n, obj="Serviços de manutenção predial", city="Jundiaí",
        seen=STAMP, hours=120, url_override=None):
    ident = f"00000000000000-1-{n:06d}/2026"
    return {
        "id": ident, "source_url": url_override or
        f"https://pncp.gov.br/app/editais/00000000000000/2026/{n}",
        "object": obj, "city": city, "organ": "Órgão fictício", "uf": "SP",
        "deadline": (NOW + timedelta(hours=hours)).isoformat(),
        "last_seen_at": seen, "sector_focus": True, "relevance": 2
    }


def snap(*rows, stamp=STAMP, partial=False):
    return {"brand": "Editalume", "generated_at": stamp,
            "opportunities": list(rows), "partial": partial}


def profile(name, **updates):
    return {"name": name, "cities": [], "keywords": [],
            "focus_only": True, **updates}


class MultiProfileTests(unittest.TestCase):
    def preview(self, snapshot, profiles, gate=GATE, previous=()):
        return build_multi_profile_preview(snapshot, gate, profiles,
                                           delivered_ids=previous, now=NOW)

    def test_validation_limited_to_three_distinct_named_profiles(self):
        self.assertEqual(len(validate_profiles([profile("SP"), profile("Interior")])), 2)
        for bad in ([], [profile("A") for _ in range(4)],
                    [profile("SP"), profile(" sp ")],
                    [profile("A", keywords=["limpeza"] * 13)],
                    [profile("A", cities=["Jundiaí", "jundiai"])],
                    [profile("A", focus_only="true")],
                    [profile("A", keywords=["x\nInjected header"])],
                    [profile("")]):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                validate_profiles(bad)

    def test_gate_requires_private_entitlement_and_opt_in(self):
        sample = snap(row(1))
        for gate in ({}, None, {"subscription_status": "active"},
                     {"subscription_status": "trial", "digest_opt_in": True},
                     {"subscription_status": "active", "digest_opt_in": "true"}):
            self.assertEqual(self.preview(sample, [profile("SP")], gate)["status"],
                             "NOT_ELIGIBLE")

    def test_dedupe_across_profiles_and_previous_deliveries(self):
        sample = snap(row(1), row(2, "Serviços de limpeza predial", city="Campinas"),
                      row(3, "Serviços de limpeza predial", city="Santos"))
        selection = [profile("Interior", cities=["Campinas", "Jundiaí"]),
                     profile("Manutenção", keywords=["manutenção"])]
        result = self.preview(sample, selection)
        self.assertEqual(result["status"], "PREVIEW_ONLY")
        self.assertEqual(result["new_ids"], [row(1)["id"], row(2)["id"]])
        self.assertEqual(result["items"][0]["matched_profiles"],
                         ["Interior", "Manutenção"])
        self.assertEqual(result["candidate_count"], 2)
        self.assertFalse(result["send_enabled"])
        after = self.preview(sample, selection, previous=[row(1)["id"]])
        self.assertEqual(after["new_ids"], [row(2)["id"]])

    def test_reject_stale_or_mismatched_links_and_old_observations(self):
        wrong = row(4, url_override="https://pncp.gov.br/app/editais/00000000000001/2026/4")
        old = row(5, seen=(NOW - timedelta(hours=8)).isoformat())
        sample = snap(row(1), wrong, old, partial=True)
        result = self.preview(sample, [profile("SP")])
        self.assertEqual(result["new_ids"], [row(1)["id"]])
        self.assertIn("PARCIAL", result["notice"])
        stale = self.preview(snap(row(1), stamp=(NOW-timedelta(days=2)).isoformat()),
                             [profile("SP")])
        self.assertEqual(stale["status"], "STALE_OR_INVALID")
        self.assertEqual(stale["items"], [])

    def test_safe_rejection_of_invalid_profiles(self):
        result = self.preview(snap(row(1)), [profile("A", keywords="services")])
        self.assertEqual(result["status"], "INVALID_PROFILES")
        self.assertEqual(result["items"], [])
        self.assertFalse(result["send_enabled"])

    def test_twelve_item_cap_and_deadline_order(self):
        rows = [row(n, hours=12+n) for n in range(1, 26)]
        result = self.preview(snap(*rows), [profile("SP")])
        self.assertEqual(result["candidate_count"], 12)
        self.assertEqual(result["new_ids"], [row(n)["id"] for n in range(1, 13)])

    def test_no_sending_or_recipient_collection(self):
        result = self.preview(snap(row(1)), [profile("SP")])
        self.assertTrue(result["preview_only"])
        self.assertFalse(result["send_enabled"])
        self.assertNotIn("recipient", result)
        self.assertNotIn("email", result)


if __name__ == "__main__":
    unittest.main()
