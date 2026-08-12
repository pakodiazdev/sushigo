---
sprint: "002"
title: Platillos Catalog & Platform Hardening
status: In Progress

created: 2026-07-31
started: 2026-07-31
completed:
last_updated: 2026-08-11

base_branch: main
base_commit: 4ac51ff
scope_issues: 14

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-001-attendance-payroll-quality.md
next:
---

# Sprint 002 — Platillos Catalog & Platform Hardening

> Ship the new Platillos (dishes) catalog end-to-end — media uploads, backend domain, and UI —
> while closing a public-repo secret exposure, an Attendance Today correctness bug, and the
> DataGrid/clock/animation technical-debt items left open after Sprint 001.

## 1. Executive Summary

Sprint 002 pulls every open, non-`deferred` Issue from `pakodiazdev/sushigo` (14 of 16 open
Issues — `#276` and `#85` remain `deferred` and are excluded, see §5.2) into one planned
increment. The headline value is the **Platillos (dishes) catalog** (`#377`, `#378`, `#379`,
`#380`, `#381`): a five-Issue chain that replaces the empty `/productos` stub with a real,
photo-capable menu catalog backed by a new reusable media-upload system. Alongside it, the
sprint closes a **Critical** security exposure (`#384` — a compromised `APP_KEY` committed to a
public repo), a **High**-value Attendance Today correctness bug (`#358`), and five Medium/Low
technical-debt Issues already open on the backlog (`#357`, `#360`, `#365`, `#382`, `#383`) plus
two small Low-tier cleanups (`#376`, `#385`).

**All scope delivered 2026-08-11:** 14 of 14 scoped Issues completed (100%) — `#384` (Critical
`APP_KEY` security exposure, PR #393), `#385` (SonarCloud `Readonly` code-smell cleanup, PR
#391), `#358` (Attendance Today "Ausentes" correctness bug, PR #395), `#376` (dead item Type
selector removal, PR #396), `#383` (Payroll Periods `DataGrid` migration, PR #398), `#379`
(Platillos dishes backend domain, PR #394), `#377` (unified media upload system, PR #392),
`#382` (daily report employee table `DataGrid` migration, PR #408), `#381` (Platillos dishes
seed data — Testing/Fakes/Development, PR #406), `#378` (reusable media gallery uploader
component, PR #407), `#365` (local pre-PR testing convention — linters + delivered tests
only, full suite is CI's job, PR #413, `ace93c8`), `#360` (ApplicationClock migration, PR
#409, `9f05de1`), and `#380` (Platillos catalog UI, PR #414, `ffb1603`) all merged to `main`.

`#357` (unify Attendance Today's card exit animation) is marked `⚠️ Deprecated` rather than
`✅` — its original PR (`#397`) was closed without merging after a root-cause analysis found
its whole bug pattern (26+ review-round fixes, almost all from guessing an action's outcome
and polling to confirm it) traced back to the frontend discarding data the backend's own
mutation response already carried. That analysis became a new Issue, `#410`, which rebuilt
the confirmed-state foundation from scratch and re-shipped the exit-animation feature on top
of it (PR #411, `bab4a4b` — tracked as opportunistic work, §5.4, since it falls outside the
original 14-Issue scope). `#357`'s acceptance criteria were fully delivered, just under a
different Issue number — it still counts toward this sprint's 14/14 completion.

File-conflict analysis (§9) found **zero shared-file collisions** among all 14 Issues — every
Issue touches a distinct set of files or a distinct route. The only real ordering constraints are
inside the Platillos chain itself (§8, Route B). As a result, Route A schedules 11 of the 14
Issues in a single conflict-free Round 1, with only the two Platillos Issues that have a hard
technical dependency (`#378`, `#381`) held to Round 2, and the Platillos UI (`#380`) — which needs
both of those — held to Round 3.

## 2. Context

Sprint 001 wrapped up its scoped implementation after 27 Issues, deferring `#276` (WhatsApp
provider integration) and `#85` (Flutter mobile bootstrap) as explicitly out of scope for now —
both remain `deferred`-labeled and are excluded from this sprint per that decision. `4ac51ff`
(this document's `base_commit`) is Sprint 001's last housekeeping commit before this sprint was
planned, not the commit that formally closed it — that happens when the PR promoting this
document (#386) merges to `main`.

Four of this sprint's Issues — `#357` (card exit animation), `#360` (ApplicationClock migration),
and the DataGrid migration pair `#382`/`#383` — were filed independently during Sprint 001's
execution window (2026-07-29–2026-07-31) but were never added to Sprint 001's own scope or its
`## 17. Follow-up Work` table; none carry a `sprint-1` label. They are picked up here as
already-open backlog debt, not as tracked Sprint 001 carry-over. `#365` documents a dev-lab
workflow fix already informally in use
(see this repo's own `[[feedback-shared-test-db-collision]]`-equivalent constraint — concurrent
`php artisan test` runs across dev-lab workspaces against the shared `mydb_test` database cause
`SQLSTATE[40P01]` deadlocks, referenced directly in `#365`'s body via `#268`/`#84`).

The Platillos catalog is new product scope, not carried-over debt: the restaurant's real menu
(sushigo-romita.com/menu) has never had a working `/productos` page — it has been a static
"Página en construcción" stub since it was first scaffolded. `#377`–`#381` build the full vertical
slice needed to make it real, including a generic, reusable media-upload system (`#377`/`#378`)
designed to also serve Employee/User avatars and Item resale photos later.

`#384` was discovered as a standalone security finding (hardcoded `APP_KEY` shared between prod
and preview, committed to git history in a public repo) — unrelated to any other Issue in this
sprint, scheduled first due to its Critical tier.

Base branch: `main`. Base commit: `4ac51ff` (Sprint 001 closure commit, "Defer #276/#85 and close
out Sprint 001 documentation").

## 3. Sprint Goal

**Sprint Goal:** Deliver the Platillos catalog as a working, photo-capable menu feature while
closing the Critical `APP_KEY` exposure and the Attendance Today correctness bug, clearing
Sprint 001's remaining technical-debt follow-ups along the way — without creating file conflicts
between parallel agents.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-07-31 |
| Started | 2026-07-31 |
| Completed | — (all scope delivered 2026-08-11; formal closure per `doc/conventions/sprints.md` §4 is still pending Sprint 003's promotion — see §17/§18) |
| Calendar duration | 11 days so far (created → 2026-08-11, last scope delivered) |
| Active workdays | 8 days (2026-07-31, 08-01, 08-03 through 08-07, 08-11 — session data recorded; no sessions logged 08-02, 08-08, 08-09, 08-10) |
| Progress (Issues completed) | 14 / 14 (100%) — `#384` (PR #393), `#385` (PR #391), `#358` (PR #395), `#376` (PR #396), `#383` (PR #398), `#379` (PR #394), `#377` (PR #392), `#382` (PR #408), `#381` (PR #406), `#378` (PR #407), `#365` (PR #413), `#360` (PR #409), and `#380` (PR #414) merged to `main`; `#357` deprecated in favor of `#410`/PR #411 (§13) |

## 5. Scope

### 5.1 Included

- **Security:** remove and rotate the hardcoded `APP_KEY` shared between prod/preview (`#384`)
- **Platillos catalog (new feature, 5 Issues):** unified media upload system (`#377`), reusable
  media gallery uploader component (`#378`), dishes backend domain (`#379`), dishes seed data
  (`#381`), dishes catalog UI (`#380`)
- **Attendance correctness:** vacation/rest-day employees missing from "Ausentes" (`#358`)
- **Attendance UX consistency:** unified card exit animation across all state changes (`#357`)
- **Technical debt:** `ApplicationClock`/`todayDateCdmx()` migration (`#360`); DataGrid migration
  for Payroll Periods (`#383`) and the daily report employee table (`#382`)
- **Dev workflow:** local pre-PR convention — linters + delivered tests only, full suite is CI's
  job (`#365`)
- **Small cleanups:** remove dead `Insumo`/`Activo` selector from item forms (`#376`); mark 4
  webapp props `Readonly<...>` to clear the last open SonarCloud code smells (`#385`)

### 5.2 Excluded

- `#276` — Integrate a real WhatsApp provider in `WhatsAppService` — `deferred` label, carried
  over from Sprint 001's closure decision, not re-evaluated this sprint
- `#85` — Mobile App Project Bootstrap (Flutter) — `deferred` label, same as above
- Any Issue not open on `pakodiazdev/sushigo` at sprint-planning time (2026-07-31)

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| — | — | — | — | No scope changes occurred during this sprint — all 14 Issues selected at planning stayed in scope through closure; see §7/§13 for final status (13 `✅`, 1 `⚠️ Deprecated` — `#357`, replaced in place by `#410` rather than removed from scope, §5.4) |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-07-31 | #388 | Add /issue slash command for end-to-end autonomous issue delivery | Already implemented ad hoc while working the sprint's issue-delivery workflow; filed and tracked here after the fact rather than left undocumented | `.claude/commands/issue.md` added, PR #389 merged to `main` (a570ed8) |
| 2026-08-05 | #404 | Make /issue run fully unattended — zero-interruption mode | Discovered while using `/issue` in practice — every remaining `AskUserQuestion` stop blocks the eventual goal of a scheduled loop that resolves newly-assigned issues with nobody watching; filed and fixed same-session rather than left as a known gap | `.claude/commands/issue.md` rewritten, PR #405 merged to `main` (24eec36) |
| 2026-08-11 | #410 | Replace guessed/polled attendance card state with the backend's own confirmed response — and rebuild the exit-animation feature on it | `#357`'s original PR (#397) accumulated 26+ review-round bug fixes, almost all from the same root cause: client state guessing an action's outcome and polling to confirm it, instead of using the confirmed `AttendanceRecord` the backend's own mutation response already returns. Filed as a new Issue to fix the root cause and rebuild the exit-animation feature on top of it, planned end-to-end this time rather than patched reactively — `#357` deprecated in its favor (§7 Round 1, §13) | `attendance-hooks.ts`/`-use-today-attendance-page.ts` rebuilt on confirmed mutation responses, FLIP grid-reflow hook ported unchanged from the #357 spike; PR #411 merged to `main` (`bab4a4b`) |

## 6. Value Ranking

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | #384 | Compromised secret (`APP_KEY`) committed to a public repo, shared between prod and preview — must be rotated |
| **High** | #377, #378, #379, #380, #358 | Platillos catalog is new, direct product value for the restaurant's real menu; #358 is a production-correctness bug affecting daily attendance operations |
| **Medium** | #381, #360, #383, #382, #357, #365 | Functional risk, testability, UI consistency, and developer-productivity work — none urgent, all carried over as tracked debt |
| **Low** | #385, #376 | Cosmetic/maintainability cleanup — 20 minutes of SonarCloud debt and a dead form selector |
| **Deferred** | #276, #85 | Excluded from this sprint per user instruction — `deferred` label, decided at Sprint 001 closure |

### Ordering principle

> **Value first, parallelism second.**

`#384` is scheduled first within Round 1 despite having the smallest estimate, because it is the
only Critical item. The Platillos High-tier chain and `#358` follow immediately. Round 1's
Low-tier items (`#385`, `#376`) are conflict-free filler — they never displace higher-value work
because every Round 1 Issue is independently assignable to its own agent/workspace.

## 7. Route A — Execution Rounds

### Round 1 — Security, Platillos foundation, and all conflict-free independent work

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #384 | Remove hardcoded APP_KEY from docker-compose.prod.yml and docker-compose.preview.yml | Critical | 1h | 2h | 0.6h | PR #393 | Hardcoded key removed from both compose files, rotation process documented; live Cloud Run rotation deferred (needs GCP access) — merged to `main` (9ca04c3) |
| ✅ | #377 | Build a unified media upload system (Storage-backed, cloud-swappable) | High | 4h | 8h | 9.5h | PR #392 | Media upload/reorder/delete + Item attach-on-save + orphan-cleanup command, a full ownership-authorization layer (owner_token, AuthorizesMediaOwnership, items.manage-media), and a fault-tolerance fix so concurrent cleanup runs no longer abort mid-sweep; unblocks #378 — merged to `main` (0f7ba7f) |
| ✅ | #379 | Build the Platillos (dishes) backend domain: categories, dishes, extras | High | 5h | 10h | 12.3h | PR #394 | Full CRUD for categories/dishes/extra groups/extra options, cascading soft-deletes wrapped in transactions, ULID public_id, per-entity subfolders, 20 endpoints + Swagger; merged to `main` (3aff508) |
| ✅ | #358 | Employees on vacation or a scheduled rest day today don't appear under "Ausentes" | High | 3h | 6h | 6.2h | PR #395 | `today_vacation` backend field + `isAbsentRow`/`isHiddenFromGrid` frontend fallback; merged to `main` (c79a46c) |
| ✅ | #360 | Migrate remaining now()/new Date() usages to ApplicationClock | Medium | 4h | 8h | — | PR #409 | Backend Actions/Services/Controllers + frontend business-date defaults migrated to `ApplicationClock`/`todayDateCdmx()`; fixed a pre-existing bug in `scripts/lint-clock-usage.sh` that made it exit early; 1511 PHPUnit + 3620 Vitest passing, script exits 0; merged to `main` (`9f05de1`) — Tracked not recoverable, its one Sessions entry was never closed out (`end: "?"`), see §12 |
| ✅ | #383 | Migrate Payroll Periods list/detail tables to the shared DataGrid component | Medium | 3h | 6h | 12.1h | PR #398 | List page migrated to `DataGrid<T>`; detail page's employee list kept as cards (expand/collapse can't map to `DataGrid`'s row model) and restyled to semantic tokens; merged to `main` (5c2256e) |
| ✅ | #382 | Migrate the daily report employee table to the shared DataGrid component | Medium | 2h | 4h | 2.6h | PR #408 | `employee-table-section.tsx` migrated to `DataGrid<T>`, `employee-row.tsx` removed, skeleton loading added; merged to `main` (4c08db8) |
| ⚠️ | #357 | Unify card exit/transition animation across all Attendance Today state changes | Medium | 2h | 4h | 32h58m | PR #397 (unmerged) | Original PR closed without merging after a root-cause analysis found its 26+ review-round bug fixes traced to one pattern: guessing an action's outcome and polling to confirm it instead of using the backend's own confirmed mutation response. Deprecated in favor of `#410` (opportunistic, §5.4), which rebuilt the feature on that corrected foundation and shipped as PR #411 (`bab4a4b`) — see §13 |
| ✅ | #365 | [Convention] Run only linters + delivered tests locally; leave full-suite regression check to CI | Medium | 1h | 2h | 0.02h | PR #413 | Reworded `pr_review_rules.md`, `testing-strategy.md` (new "Local vs CI" section), and `TESTING.md`'s quick-reference for scoped local pre-PR testing + objective-fix rule; Copilot review fixed 6 issues in a follow-up commit (incorrect shared-`mydb_test` claim vs. dev-lab's per-workspace isolated test DBs, missing Docker `cd`/`DB_DATABASE` overrides, `npx vitest run` consistency) — merged to `main` (`ace93c8`) |
| ✅ | #385 | Clear SonarCloud code-smell debt: mark webapp InfoItem/PropertyItem props as Readonly | Low | 0.5h | 1h | 0.2h | PR #391 | `inventory/item-details.tsx`, `location-details.tsx`, `variant-details.tsx`; conflict-free filler; merged to `main` (a322131) |
| ✅ | #376 | Remove Insumo/Activo from item Type selector — Inventory scoped to resale products only | Low | 0.5h | 1h | 12.7h | PR #396 | Type selector removed from item-form.tsx and product-wizard.tsx; new items default to PRODUCTO, existing item types preserved on edit — merged to `main` (c1bbe27) |
|  |  | **Round total** |  | **26h** | **52h** | **≈89.1h** |  | 10 of 11 Issues with finalized Tracked data — `#360`'s Tracked not recoverable, see §12 |

### Round 2 — Platillos: seed data and uploader component

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #378 | Build a reusable media gallery uploader component (frontend) | High | 3h | 6h | 29.9h | PR #407 | `<MediaGalleryUploader />` + `useMediaGalleryUploader()` wired into ItemForm; 100 Vitest tests + 1 Cypress E2E; merged to `main` (c1404a3) |
| ✅ | #381 | Seed Platillos (dishes) data — Testing/Fakes/Development | Medium | 2h | 4h | 37.1h | PR #406 | Testing/DishesTestSeeder, Fakes/FakeDishesSeeder, Development/DishCategorySeeder+DishSeeder (9 categories, 36 dishes) all registered and tested; two independent review rounds (Devin + human) fixed a soft-delete restore bug and moved menu data to config/seeders.php; merged to `main` (b6cd1ad) |
|  |  | **Round total** |  | **5h** | **10h** | **67.0h** |  |  |

### Round 3 — Platillos: catalog UI

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #380 | Build the Platillos (dishes) catalog UI — replaces the /productos stub | High | 5h | 10h | 3.8h | PR #414 | List grouped by category, create/edit form with create-only photo upload and extras editor, category manager (create/reorder/deactivate); 5 Copilot threads + 5 Devin/DeepWiki review rounds fixed real defects (category reorder shuffling/drift on sparse positions, categories-fetch failure blanking the catalog, blank-price silent no-op, media-ownership permission gap, Enter-key submitting the wrong form found during close-out) — merged to `main` (`ffb1603`) |
|  |  | **Round total** |  | **5h** | **10h** | **3.8h** |  |  |

### Round rules

- Issues in the same round must not modify the same files unless explicitly coordinated — see §9,
  no shared files were found across any of the 14 Issues.
- Round order represents the recommended default execution order.
- Rounds are not hard dependencies unless Route B (§8) identifies one — Round 1's 11 Issues have no
  ordering constraint among themselves and may start in any order or fully in parallel.
- When agent capacity is limited, start in this order: #384 → #377/#379/#358 → #360/#383/#382/#357/#365 → #385/#376.
- Filler work (#385, #376) starts only when higher-value Round 1 work is already assigned or blocked.

## 8. Route B — Sequential Dependencies

```text
#377 (Round 1) → #378 (Round 2)
Reason: the uploader component calls the media upload endpoint (POST /media/upload,
PATCH /media/assets/{id}, DELETE /media/assets/{id}); it cannot be built against an API that
doesn't exist yet.

#379 (Round 1) → #381 (Round 2)
Reason: the seeders write dish_categories/dishes/dish_extra_groups/dish_extra_options rows;
the tables and Eloquent models must exist first.

#379 (Round 1) + #378 (Round 2) → #380 (Round 3)
Reason: the catalog UI's create/edit form needs both the backend CRUD endpoints (#379) and the
media uploader component (#378) to wire dish photos end-to-end.
```

Soft, non-blocking note: `#379` explicitly states `#377` is "not a hard blocker for the
tables/CRUD themselves, but photos won't work until that lands" — so `#379` was scheduled in
Round 1 alongside `#377` rather than after it. Dish photo upload will only be exercisable once
both `#377` and `#379` are merged, which happens naturally by the start of Round 3.

No other product-level dependency exists among the remaining 9 Issues (#357, #358, #360, #365,
#376, #382, #383, #384, #385) — each is independently mergeable in any order.

## 9. Conflict Risk Map

| Shared file | Issues touching it | Planned rounds | Risk / Coordination |
|---|---|---|---|
| — | — | — | No shared files found across any of the 14 Issues — see methodology below |

### Conflict methodology

Every Issue in this sprint carries an explicit `## 🔗 References` and/or inline file-path list in
its body (this repo's Issue convention requires it). File lists for all 14 Issues were extracted
and cross-compared pairwise; no two Issues named the same file. The closest adjacencies —
`#385`/`#376` (both touch `code/webapp/src/components/inventory/`, but disjoint files),
`#382`/`#383` (both migrate a table to `DataGrid<T>`, but on entirely different pages/routes), and
`#357`/`#358` (both touch Attendance Today, but `#357` is `-use-today-attendance-page.ts`/
`EmployeeAttendanceCard.tsx` while `#358` is `types/attendance.ts` plus a separate backend
addition) — were individually checked and confirmed non-overlapping. No SonarCloud or generated
dependency-graph cross-check was needed since every Issue's affected-file list was already
explicit and current.

## 10. Estimate Tracking by Round

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| Round 1 | 11 | 26h | 52h | ≈89.1h (10/11 — #360 excluded, see §12) | +63.1h (+243%) | +37.1h (+71%) |
| Round 2 | 2 | 5h | 10h | 67.0h | +62.0h (+1240%) | +57.0h (+570%) |
| Round 3 | 1 | 5h | 10h | 3.8h | −1.2h (−24%) | −6.2h (−62%) |
| **Grand total** | **14** | **36h** | **72h** | **≈159.9h** (13/14 — #360 excluded) | **+123.9h (+344%)** | **+87.9h (+122%)** |

The grand-total overrun is dominated by three Issues whose own Retrospectives already explain it as
automated-pipeline wall-clock time (CI/Copilot/Devin review-loop waiting), not rework or scope
creep: `#357` (32h58m), `#381` (37h7m), and `#378` (29h55m) together account for **~99.9h** of the
**~123.9h** grand-total overage against the optimistic estimate — see each Issue's own `## 📊
Retrospective` (also §13) for the itemized breakdown.

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Planning and issue scoping | — | — | — |
| Implementation | 36h–72h | ≈159.9h | +123.9h vs Opt. / +87.9h vs Pess. |
| Code review and validation | — | — | — |
| Documentation | — | — | — |
| Rework and corrections | — | — | — |
| **Total** | **36h–72h** | **≈159.9h** | **+123.9h vs Opt. (36h) / +87.9h vs Pess. (72h)** |

Code review/validation, documentation, and rework time are not broken out separately — each
Issue's `Tracked` figure already lumps implementation together with its own review-response passes
(Copilot/Devin/SonarCloud fixes), so there is no clean split without re-deriving it from individual
session logs, same limitation Sprint 001 documented. `#360` contributes nothing to the Tracked total
(its one Sessions entry was never closed out, `end: "?"`) even though its PR (#409) merged — see §12.

### Wall-Clock Time & Parallelism

See "Wall-clock time and parallelism" under [`doc/conventions/sprints.md`
§7](../conventions/sprints.md) for definitions and computation rules. Computed 2026-08-11 directly
from every Issue's `## 📅 Sessions` array: 15 Issues had usable session data — 13 of the 14 scoped
Issues (all except `#360`, whose single session was never closed out and is discarded per the
convention's own rule) plus 2 opportunistic Issues (`#388`, `#404`) that consumed real time outside
formal scope. `#410` (opportunistic, superseded `#357`'s delivery) logged no Sessions at all and
contributes nothing to either total. `#357` itself IS included: its 6 sessions sum to `32h58m` (the
figure on its own Estimates line), used instead of its Retrospective's separately-stated `28h51m`,
which only summed the first 4 of its 6 sessions and undercounts — flagged as a live-Issue data gap
in §12. `#381`'s second session is recorded in the live Issue with a same-day end time
(`2026-08-06, 10:20→10:32`, 12 minutes), but its own Retrospective math (`775min + 1452min =
37h07m`) only reconciles if that session actually ended the *next* day (`2026-08-07 10:32`) — the
corrected date was used here; also flagged in §12. Two overnight stretches (`#388`, `#379`) are
logged as a pair of same-issue sessions split exactly at the midnight boundary (`end: "23:59"` /
`start: "00:00"` the next day) per `doc/conventions/tasks.md`'s "sessions accumulate across days"
rule — genuinely one continuous stretch of work, not two, so each pair is merged into a single
wall-clock block below rather than left as two adjacent rows a minute apart; see §12.

- **Person-hours:** 170.8h (sum of every logged session across the 15 Issues with data — scoped +
  opportunistic; never merged, per the convention's own definition — see below)
- **Wall-clock time:** 92.51h (union of all session intervals, overlapping or back-to-back
  intervals merged into single blocks per `doc/conventions/sprints.md` §7)
- **Parallelization factor:** 1.85× — on average, 1.85 sessions were open per wall-clock hour
- **Peak concurrency:** 5 simultaneous sessions, at 2026-08-01 11:49 (`#358`, `#377`, `#379`,
  `#384`, `#385`)

This sprint's parallelization factor (1.85×) is higher than Sprint 001's (1.40×), but almost
entirely because several long-running Issues (`#357`, `#378`, `#381`) had wide, overlapping
multi-hour sessions dominated by automated-pipeline wait time (§10) rather than because more agents
worked genuinely concurrently — Peak concurrency (5) is roughly in line with Sprint 001's own peak
(also 5).

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| 2026-07-31 15:40 → 2026-08-01 01:07 | 9.45h | #388 |
| 2026-08-01 11:35 → 18:03 | 6.47h | #358, #377, #379, #384, #385 |
| 2026-08-03 21:44 → 2026-08-04 20:00 | 22.27h | #357, #376, #377, #379, #383 |
| 2026-08-04 20:15 → 20:35 | 0.33h | #379 |
| 2026-08-04 21:00 → 21:40 | 0.67h | #379 |
| 2026-08-04 22:00 → 2026-08-05 00:20 | 2.33h | #379 |
| 2026-08-05 00:25 → 02:25 | 2.00h | #377 |
| 2026-08-05 09:51 → 10:16 | 0.42h | #377 |
| 2026-08-05 17:15 → 2026-08-07 11:41 | 42.43h | #357, #378, #381, #382, #404 |
| 2026-08-07 19:15 → 21:36 | 2.35h | #357 |
| 2026-08-11 01:16 → 01:17 | 0.02h | #365 |
| 2026-08-11 10:03 → 13:50 | 3.78h | #380 |

## 12. Notes on Estimate Confidence

- 13 of 14 Issues carry an explicit `**Optimistic:**`/`**Pessimistic:**` pair in their own
  `## ⏱️ Time` section — those values were copied verbatim into §7/§10.
- `#365` had **no** `## ⏱️ Time` section in its Issue body at planning time (it predated or was
  drafted outside the Time convention), so its 1h/2h estimate here was agent-generated, based on
  scope (three documentation files, no code). This has since resolved: `#365` merged (PR #413) at
  `0.02h` Tracked — well under even that low-confidence estimate — though the live Issue itself was
  never retroactively given a proper `## ⏱️ Time` section, a residual documentation gap that no
  longer affects scoping now that the Issue is closed.
- `#360`'s Issue body carried a caveat at planning time: drafted alongside `#113` and never migrated
  off a local backlog file, so its "Known violations" file list "may be stale," and the Issue
  instructed re-running `scripts/lint-clock-usage.sh` before starting to confirm the 4h/8h estimate
  still held. This was done during implementation — PR #409's own description confirms the script
  was re-run (and its own pre-existing early-exit bug fixed along the way) before landing at 0
  violations; merged as `#360` (PR #409).
- All other estimates are Issue-author scoping estimates (technical, file-list-backed), not rough
  sizing — confidence is high for Round 1's smaller items (#384, #385, #376) and moderate for the
  larger Platillos Issues (#377, #379, #380), which are new-domain work with more unknowns than a
  migration or bug fix.
- **Closure-pass data gaps found 2026-08-11:** this document (and the root `README.md`) went stale
  at 12/14 (85.7%) between 2026-08-08 and 2026-08-11 — `#360` and `#357` merged/superseded during
  that window but neither's own `/finish-pr` pass (nor a manual `/sync-sprint-progress`) refreshed
  these counters afterward, and `#380`'s row still read "PR ready, merge pending" a full 2h15m after
  PR #414 actually merged. Corrected in this closure pass; see the front matter's `last_updated` and
  §1/§4/§7/§13 for the recomputed figures. Root cause: `#357`'s original PR (#397) closed without
  merging (superseded by `#410`), which broke the normal "closing a PR auto-closes its Issue and the
  next sync picks up the merge" flow this sprint otherwise relied on.
- `#360`'s live Issue has an unclosed Sessions entry (`{"date": "2026-08-05", "start": "22:00",
  "end": "?"}`) and its `Tracked:` field still reads `_in progress_` even though PR #409 merged
  2026-08-08 — its `/finish-pr` pass evidently never ran the Retrospective/session-closing step.
  Its Tracked time is not retrofittable from the live Issue and contributes `0` to every §10/§11
  total; flagged in §17 as follow-up work (sync the real close-out time back onto the Issue, if
  recoverable from commit timestamps, matching the pattern Sprint 001 used for #305).
- `#357`'s Retrospective narrative states `**Actual total:** 28h 51m (1223m + 425m + 20m + 63m)`,
  but its own Sessions array has 6 entries, not 4 — the two later sessions (`2026-08-07 09:55–11:41`
  and `19:15–21:36`, 106m + 141m = 4h07m) are missing from that sum. The Issue's own Estimates line
  (`**Tracked:** \`32h 58m\``) correctly sums all 6 and was used throughout this document instead —
  see §11's Wall-Clock subsection. `#357` is `⚠️ Deprecated` either way (§7, §13), so this doesn't
  change its completion status, only the Tracked figures downstream.
- `#381`'s second Sessions entry (`{"date": "2026-08-06", "start": "10:20", "end": "10:32"}`) reads
  as a same-day, 12-minute session, but its Retrospective's own arithmetic (`775min + 1452min =
  37h07m`, matching the declared `Tracked: 37h 7m`) only holds if that session actually ended the
  *next* day (`2026-08-07 10:32`). Treated as a date typo in the live Issue and corrected for the
  §11 wall-clock computation; flagged in §17 to fix on the live Issue itself.
- **PR review caught a pre-existing reconciliation gap**, predating this closure pass: §7's Round 1
  table and §13 carried stale `Tracked` cells for `#379` (`8.9h`) and `#358` (`5.2h`) that didn't
  match either Issue's own declared `Tracked` (`12h15m`, `6h14m`) — this closure pass's own §10/§11
  aggregate totals were already computed from the correct live-session data, so only these two
  leftover per-row cells needed correcting (to `12.3h`/`6.2h`); Round 1's stated `≈89.1h` total
  needed no change, since it already reconciled with the corrected figures once summed from raw
  session minutes rather than the display-rounded cells.
- **PR review caught two off-by-one errors in §4's Sprint Timeline**, both genuine: (1) `Calendar
  duration` read `12 days` for `2026-07-31 → 2026-08-11`, a date-subtraction error — the actual
  difference is `11 days`, matching Sprint 001's own non-inclusive `created → completed` counting
  rule (§4 there: `2026-07-25 → 2026-07-31` = `6 days`, not 7); corrected to `11 days`. (2) `Active
  workdays`' idle-day list (`no sessions logged 08-02, 08-09, 08-10`) omitted `2026-08-08` — within
  the `07-31 → 08-11` window, 4 days have no session data (`08-02`, `08-08`, `08-09`, `08-10`), not
  3; the wall-clock block table (§11) independently confirms no interval touches `08-08`, even
  though `#360`'s PR merged that day. Corrected to list all 4.
- **PR review caught a miscount in §18's own closure checklist**: it claimed "5 net-new" follow-ups
  recorded in §17, but §17 lists 9 rows total — 3 with a filed Issue number (`#401`, `#399`, `#415`)
  and 6 with no Issue yet (rotate live `APP_KEY`, sync `#360`'s close-out time, archive `#357`/
  `#410`, fix `#381`'s Sessions date, file the `attendance-day-status.cy.ts` bug, plan/promote
  Sprint 003) — the count drifted as rows were added across this closure pass's own review-response
  commits. Corrected to "6 net-new".
- **PR review caught leftover planning-tense statements** this closure pass's rewrite missed: §5.3's
  Scope Changes placeholder still read "sprint just started, no work has been picked up" despite
  every other section declaring 100% delivered; this section's own `#365`/`#360` bullets (above)
  still instructed the reader to act "before starting" on Issues both already merged. All three
  rewritten to closure-appropriate past tense — see the corrected text above and in §5.3. The
  underlying `#365` documentation gap (no retroactive `## ⏱️ Time` section on the live Issue) is
  real but no longer scoping-relevant now that the Issue is closed.
- **PR review caught two undercounted overnight blocks** in §11's wall-clock table: `#388`
  (`2026-07-31 15:40→23:59` + `2026-08-01 00:00→01:07`) and `#379`
  (`2026-08-04 22:00→23:59` + `2026-08-05 00:00→00:20`) were each listed as two adjacent rows
  instead of merged into one continuous block, per `doc/conventions/sprints.md` §7's "overlapping
  or back-to-back intervals merged" rule and its own explicit instruction to treat a
  midnight-crossing session as ending the next day, not cut at the day boundary — matching Sprint
  001's own precedent (`2026-07-26 20:59 → 2026-07-27 06:03`, one merged row). Merged both,
  correcting Wall-clock time from `92.48h` to `92.51h` (+0.03h — the 1-minute administrative gap
  at each `23:59`/`00:00` boundary). Person-hours (`170.8h`) is unaffected, since it sums individual
  session durations without merging by definition; the parallelization factor still rounds to
  `1.85×`.

## 13. Execution Evidence

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|
| ✅ | #384 | Removed the leaked hardcoded `APP_KEY` from `docker-compose.prod.yml`/`docker-compose.preview.yml`, sourced from a required env var, and documented the generate/rotate process | PR #393 | `9ca04c3` | 0.6h | 1 Copilot review round (require APP_KEY, fail fast) + Devin/DeepWiki scan 0 bugs; live Cloud Run key rotation deliberately deferred (needs GCP project access outside this automation) — merged to `main` (9ca04c3) |
| ✅ | #377 | Built POST /media/upload, PATCH/DELETE /media/assets/{id}, media:cleanup-orphans, Item attach-on-save wiring, and — added across two follow-up review rounds — a full per-entity ownership authorization layer (AuthorizesMediaOwnership contract, MediaGallery::isManageableBy(), client-generated owner_token for mid-form galleries, dedicated items.manage-media permission) plus a fault-tolerance fix for concurrent cleanup runs | PR #392 | `0f7ba7f` | 9.5h | 40+ PHPUnit tests; 7 Copilot review threads + 4 Devin/DeepWiki cycles in session 1 (10 genuine defects, 0 false positives); a second deep review round fixed 4 more real security defects (authorize() array-input crash, gallery-hijack via unchecked attach-on-save, owner_token leaking into DELETE query strings, fail-open on a soft-deleted attachable) plus 3 more concurrency/correctness bugs; a third round fixed CleanupOrphanedMedia aborting its whole sweep when DeleteMediaAssetService::refresh() threw on an already-deleted asset, contradicting TD-02's "safe to run redundantly" claim — every fix shipped with a regression test confirmed to fail pre-fix and pass post-fix; Devin/DeepWiki final scan: 0 bugs, 7 non-blocking Investigate flags — merged to `main` (0f7ba7f) |
| ✅ | #379 | Built the Platillos (dishes) backend domain: `dish_categories`/`dishes`/`dish_extra_groups`/`dish_extra_options` migrations, models, full CRUD SAC controllers + FormRequests + JsonResources under 20 endpoints, `dishes.*` permissions, ULID `public_id`, and `Dish::totalPriceFor()` | PR #394 | `3aff508` | 12.3h | 33 Dishes Feature tests + 4 `totalPriceFor` unit tests, 1442 full-suite regression (0 failures), Pint clean; Copilot review round 1 flagged 4 cascade soft-delete gaps (chunked-query row skip, soft-deleted FK gaps, non-transactional cascades, missing empty nested relations on create), all fixed; Copilot round 2 asked for per-entity `Dish/DishCategory/DishExtra` subfolders and ULID `public_id` instead of exposing internal FKs, both implemented across all 4 tables; `/pr-comments` removed an out-of-scope Cypress spec already covered by PHPUnit; `/sonar-review` fixed 4 `php:S1192` code smells and required a mid-flight rebase onto `main` (GitHub Actions webhook anomaly on the first Sonar-fix push); all review threads resolved; CI 11/11 green — merged to `main` (3aff508) |
| ✅ | #358 | Added `today_vacation` to `TodayAttendanceController`'s response and updated `isAbsentRow`/`isHiddenFromGrid` so vacation/scheduled-rest-day employees classify as "Ausente" from the start of the day without an Attendance record | PR #395 | `c79a46c` | 6.2h | 25 new/updated PHPUnit assertions, 248 Vitest passing, 5/5 new + 15/15 regression Cypress specs (dev-lab E2E stack); Copilot review fixed 1 real defect (fallback misclassifying an actively-working employee); Devin/DeepWiki review surfaced 1 legitimate UX tradeoff (rest-day visibility in default grid), resolved via a user decision rather than a silent code change; CI 13/13 green — merged to `main` (c79a46c) |
| ✅ | #360 | Injected `ApplicationClock` into every backend Action/Service/Controller still calling `now()` directly and routed frontend business-date defaults through `todayDateCdmx()`/the clock store; fixed a pre-existing bug in `scripts/lint-clock-usage.sh` that aborted before printing its own summary | PR #409 | `9f05de1` | — | 1511 PHPUnit + 3620 Vitest (246 files) passing, Pint/ESLint/TypeScript clean, `lint-clock-usage.sh` exits 0 with zero violations; 1 Copilot review round; SonarCloud Quality Gate passed twice; CI green — merged to `main` (`9f05de1`); Tracked time not recoverable, its Sessions entry was never closed out (see §12) |
| ✅ | #383 | Migrated the Payroll Periods list page to `DataGrid<T>` (built-in pagination replacing the manual prev/next pager) and restyled `-employee-pay-row.tsx` to semantic tokens; the detail page's expand/collapse employee list stayed as cards since it can't map onto `DataGrid`'s one-row-per-item model | PR #398 | `5c2256e` | 12.1h | 52 Vitest tests (2 new component test files) + 20 Cypress tests across 6 specs (dev-lab E2E stack) passing; Copilot review fixed 1 real defect (test relying on DataGrid's nav DOM order); Devin/DeepWiki 0 bugs across 2 scan rounds, 1 flag fixed (English pagination-footer fallback), 3 flags evaluated as out-of-scope/matching established convention; CI 12/12 green — merged to `main` (5c2256e) |
| ✅ | #382 | Migrated `employee-table-section.tsx` (daily "Reporte Operacional de Hoy" employee table) to `DataGrid<T>` with a `Column<T>[]` definition, removed `employee-row.tsx` folding its per-cell markup into column renderers, and added per-column skeleton loading (a capability the old table never had) | PR #408 | `4c08db8` | 2.6h | 11 Vitest tests (including a skeleton-loading assertion that fails against the pre-migration table) + 13 Cypress tests across 2 specs (dev-lab E2E stack) passing; Copilot review fixed 1 real defect (check-in time bypassing the centralized `formatTimeInFrontendTz()` resolver); Devin/DeepWiki 0 bugs across 2 scan rounds, 1 flag fixed (`scrollIntoView()` consistency across all row assertions), 5 flags evaluated as intentional consequences of adopting the shared component; CI 12/12 green — merged to `main` (4c08db8) |
| ⚠️ | #357 | Original implementation (`staysInActiveTab` trigger, per-mutation card exit animation) accumulated 26+ review-round bug fixes, almost all from one root cause: client state guessing an action's outcome and polling to confirm it, instead of reading the confirmed `AttendanceRecord` already returned by each mutation's own response | PR #397 (closed, unmerged) | — | 32h58m | Superseded, not abandoned: the root-cause analysis done during review became `#410` (§5.4), which spliced mutation responses directly into the cached row instead of guessing/polling, and re-shipped the exit animation (plus the FLIP grid-reflow hook, ported unchanged from this Issue's spike after it reached 0 open bugs across 9 review rounds) on that corrected foundation — see `#410`'s row below. Deprecated 2026-08-11 |
| ✅ | #410 (Opportunistic, §5.4) | Spliced each of the 5 attendance mutations' confirmed `AttendanceRecord` response directly into the cached daily-attendance row instead of relying on a 30s poll; rebuilt the card exit animation (generalized to all 5 actions) and ported the FLIP grid-reflow hook on top of that foundation | PR #411 | `bab4a4b` | — (no Sessions logged on the live Issue) | 106 `use-today-attendance-page` tests (55 new) + 88 `EmployeeAttendanceCard` tests (6 new) + 2 new FLIP-hook tests + new Cypress spec (3/3 passing against the real dev-lab E2E stack); full webapp suite 3745 passed; found (and flagged, not fixed — unrelated) a pre-existing test-order dependency in `attendance-day-status.cy.ts`, see §17; CI green — merged to `main` (`bab4a4b`) |
| ✅ | #365 | Reworded `doc/conventions/git/pr_review_rules.md`, `doc/conventions/testing/testing-strategy.md`, and `doc/TESTING.md` so the local pre-PR step is "linters + delivered tests" with the full suite reserved for CI, and added the objective-fix rule for CI-detected regressions | PR #413 | `ace93c8` | 0.02h | Docs-only change, no tests/linters applicable; Copilot review fixed 6 issues in one follow-up commit (incorrect "workspaces share `mydb_test`" claim contradicted by `code/api/phpunit.xml`/`.env.testing`'s per-workspace isolation, missing Docker `cd`/`DB_DATABASE` overrides, `npx vitest run` consistency), all replied to and resolved — merged to `main` (`ace93c8`) |
| ✅ | #385 | Wrapped `PropertyItem`/`InfoItem` props in `Readonly<...>` across 3 inventory detail components, clearing all 4 open SonarCloud `typescript:S6759` code smells | PR #391 | `a322131` | 0.2h | Pure type-annotation change, no runtime behavior change; 24/24 existing Vitest tests passing, lint + typecheck clean; CI 12/12 green, Copilot 0 comments, Devin/DeepWiki 0 bugs/0 flags on first push; merged to `main` (a322131) |
| ✅ | #376 | Removed the Type (Insumo/Producto/Activo) selector from `item-form.tsx` and `product-wizard.tsx`; new items now default to `type: 'PRODUCTO'` without asking the user, and editing an existing item preserves its current type unchanged | PR #396 | `c1bbe27` | 12.7h | 37 Vitest tests updated/passing (86%+ coverage on touched files), lint + typecheck clean, no backend changes; 1 Copilot review comment addressed (brittle select-count assertion swapped for a label-absence check); Devin/DeepWiki 0 bugs, 3 informational-only flags evaluated and found not applicable; CI 12/12 green — merged to `main` (c1bbe27) |
| ✅ | #378 | Built `<MediaGalleryUploader />` + `useMediaGalleryUploader()`: drag-drop/file-picker upload, thumbnail grid with image/video preview, reorder via arrow buttons (sequential PATCHes with rollback on partial failure), remove, mark-primary, all thumbnail controls locked while a mutation is in flight; `owner_token` generated via `crypto.randomUUID()`, failing loudly rather than degrading to a predictable fallback; wired end-to-end into `ItemForm` as the first consumer — merged to `main` (c1404a3) | PR #407 | `c1404a3` | 29.9h | 100 Vitest tests (service, hook, component) + 1 Cypress E2E happy path passing against the real dev-lab backend; hit a ~15h18m external GitHub Actions infrastructure outage (jobs stuck `queued`, resolved via retrigger, unrelated to this PR's code); 5 Copilot review threads resolved; Devin/DeepWiki ran its full 5-cycle safety cap, each round fixing a genuine defect (lost primary-photo badge after delete, thumbnail controls not respecting `disabled`, batch-upload abort-on-first-failure, unsafe concurrent PATCH reorder, `Item` request/response type conflation, keyboard-inaccessible controls, a reorder race condition from rapid double-clicks); CI 12/12 green — merged to `main` (c1404a3) |
| ✅ | #381 | Built Testing/DishesTestSeeder (2 categories, 3 deterministic dishes covering every extras shape), Fakes/FakeDishesSeeder (factory volume generator), and Development/DishCategorySeeder+DishSeeder (9 live-menu categories, 36 dishes, extras groups on Ramen/Roll/Alitas) | PR #406 | `b6cd1ad` | 37.1h | 19 PHPUnit tests across 3 test files; Copilot review fixed 1 real defect (pre-existing backslash-FQCN violation in DevelopmentSeeder touched by this PR); two Devin/DeepWiki rounds plus one independent human-run code review found: (1) updateOrCreate() excluding soft-deleted rows causing duplicates on re-seed — first fix prevented duplicates but didn't restore trashed rows, corrected with a RestoresTrashedOnUpsert trait; (2) live menu catalog hardcoded in seeder classes instead of config/seeders.php per CLAUDE.md's seeder-data rule — moved to config as compact tuples to avoid reintroducing the duplication problem; (3) minor cleanups (model constants over string literals, exact-name test lookups); SonarCloud new-code duplication (23.9%) required refactoring both seeders into per-category/row-builder methods; a GitHub Actions platform outage and a /rebase-main after #382 merged first both extended wall-clock time; CI 12/12 green — merged to `main` (b6cd1ad) |
| ✅ | #380 | Built the `/productos` catalog UI: list grouped by category with photo thumbnails, search/status/category filters, `DishForm`+`useDishForm` (create/edit, create-only photo upload, extras editor), `DishCategoryManager`+`useDishCategoryManager` (create/reorder/deactivate); backend adopted the upload-first media pattern for Dish (`photo_url`, `dishes.manage-media` permission) | PR #414 | `ffb1603` | 3.8h | 81 PHPUnit + 95 Vitest tests (new code ~94% coverage) + 1 Cypress spec (2 specs) passing; 5 Copilot threads addressed; 5 Devin/DeepWiki rounds fixed real defects (category-reorder shuffling/drift on sparse positions, categories-fetch failure blanking the catalog, blank-price silent no-op, dish-photo media-ownership permission gap, Enter-key submitting the wrong form found during close-out) and evaluated every remaining flag (all accepted trade-offs or pre-existing patterns, no disputes); CI 12/12 green — merged to `main` (`ffb1603`) |
| ✅ | #388 (Opportunistic, §5.4) | Added `/issue` slash command composing `/start-issue`, `/pr-comments`, and `/finish-pr` into a single autonomous delivery pipeline | PR #389 | `a570ed8` | 9.43h | 6 Copilot review rounds + 6 Devin/DeepWiki scan rounds, all defects resolved (no business-rule disputes); merged to `main` (a570ed8) |
| ✅ | #404 (Opportunistic, §5.4) | Rewrote `/issue` (`.claude/commands/issue.md`) to remove all 5 `AskUserQuestion` stop points — ambiguities and reviewer business-rule disputes now resolve autonomously per the issue's literal text, logged in a new `## ⚠️ Needs Human Judgment` PR section; Chrome-extension-unavailable auto-skips; cost logging skipped entirely | PR #405 | `24eec36` | 1.5h | 11/11 CI checks passing; 1 Copilot thread resolved (Phase 1/Phase 4 assumption-heading mismatch); Devin/DeepWiki 0 bugs (3 defects self-caught via manual review before the automated scan) — 2 non-blocking Investigate flags remain (Sessions-entry resume guidance, finish-pr delegation language audit); merged to `main` (24eec36) |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Tests passing | — | 100% | 100% — every merged PR's CI ran green (§13); full-suite regressions (e.g. #360's 1511 PHPUnit + 3620 Vitest, #410's 3745 Vitest) reported 0 failures | ✅ |
| Coverage | — | ≥80% new code (both projects) | Met per-PR where reported (e.g. #380 ~94%, #378 100 new tests, #381 19 new tests); not separately re-aggregated into one sprint-wide figure — each PR's own SonarCloud gate is the authoritative per-PR check | ✅ |
| SonarCloud Issues | 4 code smells (webapp) | 0 | 0 — cleared by #385 (`Readonly<...>` on the 4 flagged props) | ✅ |
| Technical debt | 20min (webapp) | 0 | 0 | ✅ |
| Bugs fixed | 0 | 1 (#358) | 1 (#358) — plus #358's own review found and fixed 1 additional regression before merge (§13) | ✅ |
| Security findings | 1 known (compromised APP_KEY) | 0 new, 1 rotated | 0 new findings; the static exposure was removed from `docker-compose.prod.yml`/`docker-compose.preview.yml` and the repo's git-tracked config, but the *live* Cloud Run `APP_KEY` values were never rotated — that step needs GCP project access this automation doesn't have (§17) | ⚠️ Partial |

## 15. Results

### 15.1 Delivered Value

- **Platillos (dishes) catalog — the sprint's headline value — shipped end-to-end.** The
  `/productos` page went from a static "Página en construcción" stub to a real, photo-capable menu
  catalog: a generic, cloud-swappable media-upload system (`#377`, reused by `#378`'s uploader
  component and now `#380`'s Dish photos too), the full dishes/categories/extras backend domain
  (`#379`), seed data across all three seeder tiers (`#381`), and the catalog UI itself — list,
  create/edit form with extras editor, and category manager (`#380`).
- **Critical security exposure closed.** The hardcoded `APP_KEY` shared between prod and preview
  was removed from git-tracked compose files and the rotation process documented (`#384`) — live
  key rotation on Cloud Run remains a follow-up (§17), since it needs infrastructure access outside
  this automation's scope.
- **A real production-correctness bug fixed.** Vacation/scheduled-rest-day employees now correctly
  appear under Attendance Today's "Ausentes" from the start of the day (`#358`).
- **Attendance Today's exit-animation feature shipped**, not via its originally-scoped Issue
  (`#357`, deprecated) but via `#410`, a rebuild on a materially more correct foundation (confirmed
  mutation responses instead of guessed/polled state) — the practical outcome the sprint's Value
  Ranking (§6) wanted is delivered either way.
- **Four DataGrid/clock/dev-workflow technical-debt items closed** (`#360`, `#382`, `#383`, `#365`),
  plus two small cleanups (`#376`, `#385`), clearing all of Sprint 001's carried-over debt this
  sprint scoped in.
- **Two opportunistic deliverables landed same-sprint**, both outside formal scope: `/issue`
  (`#388`), the end-to-end autonomous issue-delivery pipeline this sprint's own Issues were largely
  run through, and its zero-interruption rewrite (`#404`).

### 15.2 Planned vs. Actual

- **Scope:** 14/14 planned Issues delivered (100%), with one substitution — `#357`'s planned
  implementation was deprecated mid-sprint in favor of `#410`'s rebuild, which delivered the same
  acceptance criteria on a corrected foundation (§13). No Issue was cancelled or left undelivered.
- **Estimate accuracy:** the sprint's own confidence notes (§12) correctly flagged the Platillos
  Issues (`#377`, `#379`, `#380`) and any Issue delivered through the unattended `/issue` pipeline as
  higher-uncertainty — that held. §10's grand-total Tracked (≈159.9h) landed +344% over the
  optimistic estimate and +122% over the pessimistic one, but the overrun is concentrated in three
  Issues (`#357`, `#381`, `#378` — ~99.9h combined) whose own Retrospectives attribute it almost
  entirely to automated-pipeline wall-clock time (CI queues, Copilot/Devin review-loop polling,
  a ~15h18m external GitHub Actions outage during `#378`) rather than rework or scope creep — see
  §16 for what this means going forward.
- **Parallelism:** 1.85× (§11) — higher than Sprint 001's 1.40×, though driven more by long
  overlapping single-Issue sessions than by materially more concurrent agents (peak concurrency was
  5 in both sprints).
- **Doc hygiene regressed mid-sprint:** this document and the root `README.md` drifted to a stale
  85.7% (12/14) between 2026-08-08 and 2026-08-11 before this closure pass caught and corrected it
  (§12) — the one real process miss against the plan.

### 15.3 Known Limitations

- **Live `APP_KEY` rotation is still pending** on Cloud Run (`#384`) — the static/git-history
  exposure is closed, but the actual credential values in the prod/preview environments have not
  been rotated yet.
- **`#357`'s and `#360`'s live GitHub Issues carry incomplete closure metadata** — neither has a
  `## 📊 Retrospective`-aligned final `Tracked` figure matching the pattern the rest of the sprint's
  Issues follow (`#360`'s Sessions entry was never closed; `#357`'s Retrospective undercounts its
  own Sessions array), and neither has a `doc/tasks/2026-08/` archive snapshot — `#410` (the Issue
  that actually shipped `#357`'s value) has neither Sessions data nor an archive either. All three
  are recorded as follow-up work (§17) rather than silently fixed by editing closed Issues as part
  of this documentation-only closure pass.
- **A pre-existing, unrelated Cypress test-order dependency** in `attendance-day-status.cy.ts` was
  found (not fixed) during `#410`'s regression testing — see §17.
- **Coverage is not re-aggregated sprint-wide** — §14's "≥80% new code" target is verified per-PR by
  each PR's own SonarCloud gate; this document does not recompute a single sprint-wide percentage.

## 16. Lessons Learned

- **A deprecated-Issue-and-rebuild is a legitimate outcome, not a failure to document as one.**
  `#357`'s PR accumulating 26+ review rounds on the same root cause (guessed/polled state) was a
  genuine signal to stop patching and rebuild on the right foundation — filing `#410` and marking
  `#357` `⚠️ Deprecated` (rather than force-merging the patched-up original, or quietly rewriting
  history to make `#357` look like it shipped normally) is exactly what `doc/conventions/sprints.md`
  §5's status-marker rules are for. Recognize this pattern earlier next time — a Devin/DeepWiki
  review finding the *same class* of bug on 3+ consecutive passes is itself evidence the fix is
  addressing a symptom, not the cause.
- **Re-run the sprint-progress sync every time a long-running PR merges, not just when a new round
  starts.** `#357`'s own Retrospective (§12) already shows two `/rebase-main` passes that had to
  resolve conflicts on this very document's progress counters — the sync discipline exists, but this
  sprint still went stale for 3 days after `#357`(→`#410`)/`#360`/`#380` all merged. The
  `sync-sprint-progress` skill exists precisely for this and should be run immediately after any
  merge, not batched until someone notices the percentage looks wrong.
- **The unattended `/issue` pipeline's own review-loop wall-clock time is now a measurable,
  recurring cost, not sprint-specific noise.** Three Issues this sprint (`#357`, `#378`, `#381`)
  independently attributed the bulk of their overrun to the same mechanism: CI queues, Copilot
  polling windows, and Devin/DeepWiki's multi-round safety cap. This is a real property of the
  pipeline worth estimating *for*, not against — a future estimate for a similarly-scoped Issue
  delivered through `/issue` should budget pipeline wall-clock time as its own line item, distinct
  from implementation time, exactly as `#357`'s own Retrospective already recommends.
- **`/finish-pr`'s closure checklist has a gap when a PR closes unmerged.** `#360` merged cleanly but
  never got its Retrospective/session-closing step; `#357`'s original PR closing unmerged (superseded
  by `#410`) meant neither Issue got the local `doc/tasks/` archive the convention requires. The
  checklist assumes the common case (PR merges, issue closes via `Closes #NNN`) — it needs an
  explicit path for "Issue closed some other way" so this kind of gap doesn't require a separate
  closure-pass audit to catch, six-plus days later, next time.

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | — | Rotate the live Cloud Run `APP_KEY` (prod + preview) | `#384` closed the static/git-history exposure but deliberately left live rotation out of scope — needs GCP project access this automation doesn't have | Next |
| ⏳ | #401 | Employee avatar upload with initials-based fallback placeholder | Deliberately scoped out of `#377` — reuses the media upload system it built, applied to `Employee`/`User` avatars this time | Next |
| ⏳ | #399 | Expose `public_id` (ULID) for Item/ItemVariant and the rest of the Inventory domain | Raised during `#377`'s review — `Item` is still addressed by raw sequential integer id, unlike the 20+ models (including `#377`'s own `MediaGallery`/`MediaAsset`) already on the `HasPublicId` convention | Next |
| ⏳ | #415 | Adopt integer minor-units (cents) for monetary fields | Raised during `#380`'s review discussing `Dish.base_price`/`DishExtraOption.price_delta`; deferred (`priority: low`) until a multi-currency/SaaS pivot makes it load-bearing, see `[[project-td-cents-money-fields]]` memory | Deferred — revisit at SaaS pivot |
| ⏳ | — | Sync `#360`'s real close-out time back onto its live Issue (recover from PR #409's commit timestamps if its session truly can't be reopened), matching the pattern Sprint 001 used for `#305` | `#360`'s Sessions entry was never closed (`end: "?"`) despite merging 2026-08-08 — its Tracked time contributes `0` to every total in this document (§12) | Next |
| ⏳ | — | Archive `#357` and `#410` to `doc/tasks/2026-08/` and correct `#357`'s live Retrospective total (28h51m → 32h58m, all 6 sessions) | Neither Issue has a local archive snapshot — `#357` because its delivering PR (#411) is filed under `#410`, `#410` because it was never run through `/finish-pr`'s archive step; `#357`'s Retrospective narrative undercounts its own Sessions array (§12) | Next |
| ⏳ | — | Fix `#381`'s live Issue Sessions entry — its second session's `end` date is one day off (`2026-08-06` instead of `2026-08-07`), contradicted by its own Retrospective arithmetic (§12) | Found during this closure pass; corrected only in this document's §11 computation, not on the live Issue | Next |
| ⏳ | — | File and fix the pre-existing `attendance-day-status.cy.ts` test-order dependency found (not fixed) during `#410`'s regression testing — its "Justificar Falta" case depends on run order within a shared `before()` reset | Explicitly flagged as out-of-scope in PR #411's own description; unrelated to `#410`'s diff (`git diff main` empty for that file) | Next |
| ⏳ | — | Plan and promote Sprint 003 | Per `doc/conventions/sprints.md` §4, a sprint is *formally* complete only once its closure checklist is done **and** the next sprint becomes current — no Sprint 003 exists in `doc/sprints/planned/` yet, so Sprint 002 remains the highest-numbered (i.e. "current" by location) sprint even though its own scope is 100% delivered (§18) | Next |

## 18. Sprint Closure Checklist

- [x] All included work items have a final status marker. (13 `✅`, 1 `⚠️ Deprecated` — `#357`, §7/§13)
- [x] Completed items include Pull Request or commit evidence. (§13)
- [x] Deprecated items identify their replacement. (`#357` → `#410`/PR #411, §7/§13)
- [x] Cancelled items include a reason. (N/A — no `❌ Cancelled` items in this sprint's scope)
- [x] Scope changes are recorded. (N/A — no scope changes; §5.3 unchanged, §5.4 gained one opportunistic entry, `#410`)
- [x] Tracked time was synchronized from Issue sessions. (§10/§11/§13's Tracked figures are derived directly from raw Sessions data, including a corrected total for `#357` and a corrected session date for `#381` — see §12 for both. `#360` remains a genuine, unrecoverable gap: `0` contributed, flagged in §17, not silently estimated)
- [x] Round totals and sprint totals were recalculated. (§7, §10)
- [x] Estimate variance was calculated. (§10)
- [x] Consolidated effort was completed. (§11's Implementation row is fully computed from session data; Planning/Review/Documentation/Rework intentionally left as `—` and explained inline, same permanent limitation Sprint 001 documented)
- [x] Wall-clock time, parallelization factor, and peak concurrency were computed (§7 of `doc/conventions/sprints.md`, §11 of this document).
- [x] Dependencies reflect actual execution. (§8 — `#377`→`#378`, `#379`→`#381`, `#379`+`#378`→`#380` all held; no dependency broke when `#357` was deprecated, since nothing in §8 depended on it)
- [x] Conflict notes reflect actual execution. (§9 — no shared-file conflicts materialized during execution, consistent with the pre-sprint analysis)
- [x] Tests and relevant quality metrics were recorded. (§14)
- [x] Delivered value and known limitations were documented. (§15)
- [x] Follow-up work was created or recorded. (§17 — 3 already-filed Issues linked, 6 net-new follow-ups recorded, none yet filed as their own GitHub Issues)
- [x] Lessons learned were captured. (§16)
- [x] Metadata dates and status were updated. (front matter `last_updated: 2026-08-11`; `status` deliberately kept `In Progress` and `completed` deliberately left empty — per `doc/conventions/sprints.md` §6, both are only set at *formal* closure, which per §4 requires the next sprint's promotion, not yet done — see next item)
- [ ] The next sprint was promoted or created when applicable. **Not done** — no Sprint 003 exists yet in `doc/sprints/planned/`. Per `doc/conventions/sprints.md` §4, this is the one checklist item that keeps Sprint 002 from being *formally* complete even though every other item above is done and its own scope is 100% delivered (§1/§4/§7/§13); recorded as the last §17 follow-up item. Until a Sprint 003 is planned and promoted, this document's `status` field correctly stays `In Progress` per the location-based lifecycle rule (§4's own lifecycle table: "highest-numbered sprint in `doc/sprints/`" = current/in progress), even though every Issue in its scope is done.
