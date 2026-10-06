# CIPRI Studio — PWA inspiration and rollout plan
Checkpoint: 29 September 2026. Distinguish ideas, code merged into GitHub main, build published on GitHub Pages, Vercel previews, and production acceptance. No OSS source is copied blindly.

## Verified references and license treatment
- [Memos](https://github.com/usememos/memos) (MIT): quick capture, chronological feed, search, pins, and local-first product patterns. EU already has one-tap link capture, pin/favorite, bidirectional record links, living threads and export/restore that preserves record IDs/relations. Avoid duplicating these; physical Safari acceptance QA remains separate.
- [Actual Budget](https://github.com/actualbudget/actual) (MIT): reconciliation inbox and envelopes. Fôlego reference ONLY until session/AI and user isolation launch gates are satisfied; use original Flutter money and privacy rules.
- [Sossoldi](https://github.com/RIP-Comm/sossoldi) (verify current license/commit before reuse): Flutter portfolio/asset visual patterns. No simulated yields; account-scoped amounts and restored privacy masks.
- [wger](https://github.com/wger-project/wger) (AGPL): progression, movement guidance, nutrition linking. Inspiration only; do not incorporate AGPL code into a closed-source commercial app without reviewing obligations.
- [Ballast](https://github.com/N-O-P-E/Ballast) (license must be checked per selected commit): phase visualization. Traço already has phases/deload; its weekly history feature is merged.
- [Vikunja](https://github.com/go-vikunja/vikunja) (AGPL): shareable filtered views and recurrence UX. Inspiration only; original public-filter link implementation for Editalume in PR #24.
- [FSRS Dart](https://github.com/open-spaced-repetition/dart-fsrs) (verify selected version/license): spaced repetition. Repertório prototype must preserve and migrate existing study history, never reschedule silently.
- Meditation timer OSS: original sounds/timers only; no copyrighted audio copied into ALINHA.

## Current implementation state
| Product | Already in main / existing work | Next specific microtask | Release gate |
| --- | --- | --- | --- |
| Fôlego | Flutter app; Fôlego 360 draft integration, read-only AI fallback and separate exploratory Pages beta | Stabilize authenticated AI error handling and all-user Premium contract on a synthetic isolated project; then original account-scope budget reconciliation | Real synthetic A/B HTTPS RLS QA, iPhone, RevenueCat sandbox, consent, user-owned launch approval |
| Editalume | Independent Supabase, public national sampled search, survey and Asaas sandbox webhook | Manual shareable keyword/UF/city filter links and restore without an account **merged in PR #24**; confirmed latest sample dates/unknown coverage also merged | PR #24 CI, desktop/320px/WebKit, accessibility and post-merge GitHub Pages deploy **passed**; verify actual sampled UF freshness and quality before commercial coverage claims |
| EU | PWA GitHub Pages; quick capture, duplicate-link warning, bidirectional record/project links, memory threads, encrypted/common backup and restore, Brain + adaptive Life OS | Stabilize iPhone interaction/visual edge cases and keep relationship inference conservative | CI/build/thread tests passed on current implementation; physical authenticated Safari/iPhone acceptance remains the only device-specific gate |
| Repertório | Flutter GitHub Pages; stable finite flashcard queue merged | Compare baseline scheduler versus FSRS behind explicit opt-in migration on synthetic fixtures | No silent mass rescheduling; flutter analyze/test and mobile restore |
| Traço | GitHub Pages; weekly phase progress with six regression tests merged | Rest/recovery configuration and original movement progression controls; never reimplement existing phase/deload or invent load | Existing data import/export regression and physical iPhone offline QA |
| ALINHA | Meditation wake lock merged into feature branch; primary Universo experiences PR #5 pending integration | Complete integration PR #5 and verify install, local backup migration between different origins and Safari timer | Protected Vercel preview access + physical iOS/Android approval before public release |

## Public app / preview URLs (status subject to independent deployment verification)
- Fôlego exploratory PWA: https://caueccipriano.github.io/folego-app/ (NOT proven to be latest unmerged 360 code, and NOT general-customer ready).
- Editalume: https://caueccipriano.github.io/mylife-caue-app/radar/ (independent scoped PWA under the EU hosting repository).
- EU: https://caueccipriano.github.io/mylife-caue-app/
- Traço: https://caueccipriano.github.io/v60-workout-app/
- Repertório: https://caueccipriano.github.io/repertorio-app/
- ALINHA protected preview from docs/QA.md: https://alinha-4scowpccj-cipri-studio.vercel.app (may require Vercel team sign-in; inspect deployment before implying open access). GitHub repo has no GitHub Pages deployment.

## Ship decisions
1. No blanket deployment of beta drafts from other app repositories.
2. Merge simple, safe, green changes when they preserve existing work; new payment/auth/RLS/notifications remain gated.
3. Every rollout gets the exact GitHub Actions run or protected Vercel deployment cited in its release note; public URLs alone are not HTTP uptime evidence.
4. Prioritize sign-in/AI correctness in Fôlego and verified coverage + survey + sandbox billing in Editalume before unrelated features.
5. Do not disclose private beta participant details, app credentials or test results to outside services.

## Release verification: shareable search
- [PR #24](https://github.com/caueccipriano/mylife-caue-app/pull/24) merged into `main` following passing CI, accessibility and Chromium/WebKit browser QA on its head commit.
- Post-merge [GitHub Pages deployment](https://github.com/caueccipriano/mylife-caue-app/actions/runs/36641166343) and [mobile/browser QA](https://github.com/caueccipriano/mylife-caue-app/actions/runs/36641166334) both passed for the integrated commit.
- Public URL is https://caueccipriano.github.io/mylife-caue-app/radar/ . Browser HTTP reachability can still depend on viewer connection and cache. This is not certification of all 27 UFs nor activation of Asaas billing.
