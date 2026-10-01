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

## 01/10/2026 — Accounts and single Pro plan
- Public offer: **Explorar grátis** + **only one paid plan, Editalume Pro at proposed R$ 49,90/month**. No Business/other subscription tier. Do not imply recurring Asaas payment is wired.
- Added passwordless Supabase email login screen `/radar/conta.html`, private synced favorites and limited guest/device bookmarks without deleting older guest data.
- Supabase migration `editalume_account_private_favorites_and_quotas` was applied to the existing dedicated project. Follow-up `editalume_favorites_revoke_unwanted_grants` removed inherited UPDATE/TRUNCATE/TRIGGER permissions: owner-bound RLS and five authenticated Free / two hundred verified Pro favorites are database-enforced.
- Existing three saved-search quotas remain gated by verified Pro entitlement. No web client can self-upgrade; entitlement table is owner-read-only.
- Subscription, semantic search, daily digest, dispatch, payment webhooks and cancellations remain **NOT ACTIVE**; users must not be charged for unavailable capabilities. Keep earlier five pilot invites free as promised.
- Before opening public signups, **owner must** configure Supabase Auth Site URL / Redirect URLs to include exact `https://caueccipriano.github.io/mylife-caue-app/radar/conta.html`, review auth email sender/deliverability, and complete a real email login test plus two-account RLS isolation test. Until then, published screen is beta and not proof that sending login emails works for real users.
- Privacy summary and user deletion requests: `/radar/privacidade.html`. Implement a self-serve auth-account deletion flow after separate security review; existing private favorites can be removed individually.
