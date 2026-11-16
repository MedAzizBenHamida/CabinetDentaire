# Phase 2

## Controlled transfer to official GitHub repository
- [x] Inventory 154 candidate files and resolved versions, inspect external Supabase and Lovable dependencies, save TRANSFER-READINESS.md and candidate hash manifest; 52 local tests and 30 separately configured anonymous API tests pass. No remote writes.
- [x] Verify official repository access through Aziz's GitHub API: read/write permissions confirmed; branch list empty and Git refs return 409 "Git Repository is empty". Native sync status remains UI-only.
- [x] Initialize develop only through GitHub Contents API: commit d98a7450eecbc4da06d0efd6c0f92710cd2d1e66 adds only DEVELOPMENT-SETUP.md; branch list and tree verified, main absent.
- [ ] Perform authorized full source transfer to develop: preserve initial commit/file, exclude secrets, add fictitious local configuration and setup documentation, regenerate inspected manifest and verify remote contents. Never create another repository or write main.
- [ ] Retrieve the development branch in VS Code for local validation before a production Pull Request; no Vercel creation authorized.

## Patient appointment history
- [x] Add patient-scoped, audited past-appointment reading with service, date/time and cancellation, without inventing a completed-treatment status.
- [x] Display independently paginated history above medical notes; six focused tests pass, build OK, private dossier redirects to sign-in without runtime errors.
- [ ] Verify authenticated history read-back: external unmanaged staff session unavailable in this environment.

## Automatic patient association
- [x] Resolve request patients by first name, last name and phone, with birth-date safeguards for homonyms; automatically associate one exact match, require selection for multiple matches and review for mismatched birth dates.
- [x] Atomically reuse or create the patient record during staff confirmation, sharing the patient-save identity lock; 11 rule tests pass, database wrappers and anonymous denial verified.
- [ ] Verify authenticated new/existing patient confirmation and read-back: blocked by external unmanaged staff session unavailable in this environment.

## Reference redesign — request form and assignment modal (screenshots 2026-11-16)
- [x] Rework the public request into four steps: contact, open-day grid (no scroll box, from new public open-days RPC), period, optional care cards including « Je ne sais pas encore »; desired care stored on the request via the extended submission RPC.
- [x] Rebuild the staff assignment dialog: patient card, patient record link, service-driven duration, « Limiter à la préférence / Voir toute la journée » toggle, 30-minute slot grid from real openings minus agenda conflicts, summary card and confirmation.
- [x] Verify the four-step public flow in the browser (24 open days, 9 care cards, no runtime error), 16 slot/schema tests and the full suite (44 passed); staff modal verified only signed-out (redirect), authenticated rendering blocked by unavailable external staff session.

## Complete public home
- [x] Add shared public header/footer, home care overview, cabinet hours, FAQ and contact pages using confirmed telephone numbers and reference care categories; preserve automatic period selection and booking rules.
- [x] Verify public navigation across five pages, both telephone links, expandable FAQ and real automatic period selection on desktop, 681px and 390px; no overflow or runtime errors, eight tests pass. No fictitious request submitted. Address, email and real cabinet photographs remain unsupplied and are omitted.

## Professional patient presentation
- [x] Refine the patient page using the supplied editorial reference without changing booking rules or inventing clinical claims.
- [x] Replace the shared heart logo with a tooth and matching favicon; desktop, 681px and 390px layouts, images, period selection and staff link verified; seven targeted tests pass, no runtime errors or overflow.

## Actual cabinet configuration
- [x] Configure the owner-approved weekly intervals: Monday–Friday 08:00–13:00 and 15:00–17:00, Saturday 08:00–13:00, Sunday closed; database read-back, five tests and public browser period selection pass without runtime error or mobile overflow.
- [x] Research indicative service durations using NHS and dental-practice sources; owner approved all seven.
- [x] Activate and verify the seven approved service durations: database assertions and read-back match every value; retain tests against the actual seed migration.

## Patient-facing access — requested « le côté patient »
- [x] Show the existing no-account patient request form on home; preserve /rendez-vous and separate /auth staff access.
- [x] Verify patient home, real availability lookup, preserved /rendez-vous and separate /auth access on desktop/mobile; seven targeted tests pass, no runtime error or mobile overflow. Full submission still awaits configured opening periods.

## Complete remaining validated functionality — requested « Tout développer »
- [x] Add shared staff navigation and day/week/month agenda with appointment/block creation, movement and cancellation.
- [x] Add public request form, configured-period availability, staff queue and manual patient-linked confirmation, with atomic public submission throttling.
- [x] Add SUPER_ADMIN staff activation/role management and confidential audit viewer.
- [x] Test portable input rules and verify real public availability and signed-out protections on desktop/mobile: no configured period on November 16, submission disabled, no runtime error or mobile overflow.
- [ ] Verify public submission/read-back and all authenticated workflow mutations: blocked by unset real opening/service configuration and unavailable external staff session.

## Phase 3 — authorized by « suivant »
- [x] Add administrator settings for treatment durations, weekly opening intervals and exceptional closures without inventing configuration values.
- [x] Verify settings validation, 21 targeted tests and signed-out redirect to /auth without runtime errors.
- [ ] Verify authenticated settings save/read-back and desktop/mobile form layout: blocked by unavailable external staff session; signed-out checks do not prove this flow.
- [x] Add patient medical-note view, draft creation/editing, immutable history and verified-dentist finalization using existing audited RPCs.
- [x] Check 19 targeted tests and 29 anonymous API tests; signed-out dossier redirects to /auth without medical content or runtime errors.
- [ ] Verify medical creation/edit/history/finalization and desktop/mobile dossier layout with real authorized data: blocked by unavailable external staff session, not verified by signed-out checks.
- [x] Build staff sign-in and protected patient search/create/edit screens against the existing audited operations.
- [x] Verify signed-out redirect to /auth, password visibility, no mobile overflow, desktop/mobile screenshots and 17 passing targeted tests.
- [ ] Verify authenticated patient create/edit/read-back and permissions: blocked by unavailable authorized external staff session; no successful staff login claimed.

- [x] Complete the validated database foundation: care resource, services, opening/closure configuration, shared booking/block conflict enforcement, pending requests and atomic confirmation, versioned medical notes, staff management and audits.
- [x] Validate the new foundation with rolled-back PostgreSQL fixtures, RLS structure, clean linter and 45 passing tests; authenticated application flows and concurrent two-session execution remain unverified.

- [x] Introduce portable validated business rules and executable tests.
- [x] Connect and verify the exact external backend zthgemzkhyznkhpwrrhe.
- [x] Create profiles, inactive-by-default staff accounts, separate roles and read-only RLS; database linter passes.
- [x] Check anonymous API responses for the three staff tables and retain executable integration checks; empty responses do not prove authenticated RLS or trigger behavior.
- [ ] Test account lifecycle and RLS with authenticated accounts: blocked by lack of an authorized external staff session; first SUPER_ADMIN and verified dentist must be provisioned by the owner.
- [x] Record and unit-test assistant medical read/create/edit rights, dentist-only finalization and all-patient scope for active staff.
- [x] Create patient identity schema, birth-date/phone validations and private change-event audit, without any patient seed data.
- [x] Implement audited, paginated patient read/search SQL operations with active-role checks; no direct client reads.
- [ ] Verify authenticated patient search, audit read-back and mutations; external authenticated testing is unavailable here.
- [x] Implement patient and medical-note schema with backend enforcement, audited reads and immutable versions; lifecycle extensions and retention are deliberately not invented.
- [x] Configure actual opening hours and all seven owner-approved service durations.
- [ ] Extend request/appointment lifecycle and retention automation: awaiting cabinet owner's validated decisions.
- [ ] Resolve target delivery: standalone Vite / Edge Functions cannot replace this environment's required TanStack Start stack; existing official GitHub repository cannot use native sync.
- [ ] Verify authenticated backend flows after the exact external project is connected and rules are confirmed.

Staff interfaces and public request submission are implemented. DATABASE-READINESS.md records verification limits and remaining prerequisites; submission stays unavailable when no configured period exists.