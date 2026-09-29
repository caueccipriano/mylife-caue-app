"""Editalume Premium: offline, read-only multi-profile candidate preparation.

A private backend must independently verify subscriber entitlement, digest opt-in,
and delivery state before calling this module. There is NO network access, email
sending, recipient handling, or customer-data persistence here.
"""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from pro_digest import MAX_RESULTS, build_preview, norm

MAX_PROFILES = 3
MAX_FILTER_VALUES = 12


def _clean_label(value: Any, limit: int) -> str | None:
    if not isinstance(value, str):
        return None
    # Reject header/control injection before normalizing ordinary whitespace.
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in value):
        return None
    value = " ".join(value.split())
    if not value or len(value) > limit:
        return None
    return value


def validate_profiles(profiles: Any) -> list[dict[str, Any]]:
    """Fail closed, without accepting arbitrary untrusted profile attributes."""
    if not isinstance(profiles, list) or not 1 <= len(profiles) <= MAX_PROFILES:
        raise ValueError("One to three profiles are required")
    clean = []
    seen_names = set()
    for profile in profiles:
        if not isinstance(profile, dict):
            raise ValueError("Profile must be an object")
        name = _clean_label(profile.get("name"), 50)
        if not name or norm(name) in seen_names:
            raise ValueError("Profiles need distinct names of at most 50 characters")
        seen_names.add(norm(name))
        if not isinstance(profile.get("focus_only"), bool):
            raise ValueError("focus_only must be a boolean")
        normalized = {"name": name, "focus_only": profile["focus_only"]}
        for field, max_length in (("cities", 70), ("keywords", 90)):
            values = profile.get(field)
            if not isinstance(values, list) or len(values) > MAX_FILTER_VALUES:
                raise ValueError(f"{field}: zero to twelve items are permitted")
            validated = [_clean_label(v, max_length) for v in values]
            if any(v is None for v in validated):
                raise ValueError(f"{field} contains an invalid value")
            if len({norm(v) for v in validated}) != len(validated):
                raise ValueError(f"{field} cannot contain duplicates")
            normalized[field] = validated
        clean.append(normalized)
    return clean


def build_multi_profile_preview(snapshot: dict, account_gate: dict,
                                profiles: Any, delivered_ids=(), *,
                                now: datetime | None = None) -> dict:
    """Prepare up to 12 deduplicated leads across <=3 filters; never deliver.

    account_gate must originate in trusted private server-side storage, never
    from the client request. This function is NOT an authentication boundary.
    """
    blocked = {"status": "NOT_ELIGIBLE", "items": [],
               "send_enabled": False, "preview_only": True,
               "notice": "Subscriber status and explicit digest consent are required."}
    if (not isinstance(account_gate, dict) or
            account_gate.get("subscription_status") != "active" or
            account_gate.get("digest_opt_in") is not True):
        return blocked
    try:
        valid_profiles = validate_profiles(profiles)
    except ValueError as exc:
        return {"status": "INVALID_PROFILES", "items": [],
                "send_enabled": False, "preview_only": True, "notice": str(exc)}

    now = now or datetime.now(timezone.utc)
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise ValueError("A timezone-aware clock is required")
    prior = {ident for ident in delivered_ids if isinstance(ident, str)}
    indexed: dict[str, dict] = {}
    matched: dict[str, set[str]] = defaultdict(set)
    warning = ""
    for profile in valid_profiles:
        candidate = build_preview(
            snapshot,
            {"consent": True, "entitlement": "active",
             "cities": profile["cities"], "keywords": profile["keywords"],
             "focus_only": profile["focus_only"]},
            delivered_ids=prior, now=now
        )
        if candidate["status"] != "PREVIEW_ONLY":
            return {"status": candidate["status"], "items": [],
                    "send_enabled": False, "preview_only": True,
                    "notice": candidate["notice"]}
        warning = candidate["notice"]
        for record in candidate["items"]:
            ident = record["id"]
            if ident in prior:
                continue
            indexed[ident] = record
            matched[ident].add(profile["name"])
    selected = sorted(
        indexed.values(),
        key=lambda r: (r["deadline"], -int(r.get("relevance") or 0), r["id"])
    )[:MAX_RESULTS]
    items = [{"record": row, "matched_profiles": sorted(matched[row["id"]])}
             for row in selected]
    body = [
        "Editalume | prévia consolidada dos alertas Premium",
        warning,
        "Os editais e respectivos prazos devem ser verificados no PNCP.",
        ""
    ]
    for item in items:
        record = item["record"]
        body.extend([
            "Perfis: " + ", ".join(item["matched_profiles"]),
            str(record.get("object", ""))[:350],
            "Município: " + str(record.get("city", "")) + "/SP",
            "Prazo informado: " + str(record["deadline"]),
            "Fonte: " + record["source_url"],
            ""
        ])
    return {
        "status": "PREVIEW_ONLY", "preview_only": True, "send_enabled": False,
        "items": items, "new_ids": [item["record"]["id"] for item in items],
        "candidate_count": len(items), "notice": warning, "body": "\n".join(body)
    }
