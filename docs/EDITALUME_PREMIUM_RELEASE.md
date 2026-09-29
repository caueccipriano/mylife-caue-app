# Editalume — Premium release gate

## Executed so far
- Public search remains free and uses verified PNCP URLs for sample records. The index is not the complete PNCP.
- `pro_digest.py` produces an offline candidate preview for a **single** consented/eligible profile.
- `premium_profiles.py` composes at most **three** distinct search profiles into a maximum of **twelve** unique, new, recently observed candidate opportunities, ordered by deadline, and never sends email or handles recipients.
- All profile filters are validated server-side before previewing; data older than the existing freshness threshold stops the preview.
- Offline CI includes safety tests for stale feeds, mismatched IDs, invalid configurations, entitlement and consent gates, duplicates, and the twelve-item limit.

## Non-negotiable launch gates
1. Create an Editalume-specific private project/data store; **do not reuse the Fôlego development database**.
2. Implement customer authentication, email verification, and separate account-level subscription and digest opt-in storage, with owner-bound RLS and a tested deletion/export workflow.
3. Store up to three profiles per entitled subscriber; validate on the server. Never accept client-supplied `subscription_status` or `digest_opt_in` as authoritative.
4. Implement a private per-subscriber delivery log keyed by subscriber ID, canonical notice ID, and digest period, enforcing idempotency and honoring unsubscribe immediately.
5. Use a commercial sending domain with SPF/DKIM/DMARC, authenticated webhook handling, bounce/complaint processing, unsubscribe and human response monitoring.
6. Verify the PNCP feed is fresh and distinguish notices **actually reconfirmed** in the latest collection from carried-forward historical entries before any automatic alert.
7. Integrate checkout and verify payment-provider webhooks server-side. Never represent a proposed price, trial, or preview as an active paid entitlement without provider confirmation.
8. Publish accurate terms, privacy notice, independent-platform disclaimer and price before taking payment. Review actual delivery on phones and desktop and test failures without mailing real prospects.

## Delivery behavior
- No email is sent by repository scripts; no addresses, tokens or credentials belong in public GitHub.
- `premium_profiles.build_multi_profile_preview(...)` is a pure, offline **candidate** generator, not an access-control mechanism. The calling private backend is responsible for authentication, billing, consent and delivery.
- Every automated email must disclose that the indexed catalogue is limited and link to the originating official PNCP record. Changed/expired/cancelled items must not be marketed as confirmed.
- Test a private end-to-end sandbox flow for two distinct accounts and verify that one customer's profiles, deliveries and entitlements cannot be accessed by the other.

## Launch stage
Public search is in pilot. Premium alert generation is being built and validated **offline**, with billing/delivery intentionally disabled until the above security and operational gates pass.
