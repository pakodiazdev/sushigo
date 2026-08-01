---
sprint: "002"
title: Platillos Catalog & Platform Hardening
status: In Progress

created: 2026-07-31
started: 2026-07-31
completed:
last_updated: 2026-07-31

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

**Progress as of 2026-08-01:** 3 of 14 scoped Issues completed (21.4%) — `#384` (Critical
`APP_KEY` security exposure, PR #393), `#385` (SonarCloud `Readonly` code-smell cleanup, PR
#391), and `#358` (Attendance Today "Ausentes" correctness bug, PR #395), all open and ready for
merge.

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
| Completed | — |
| Calendar duration | — |
| Active workdays | — |
| Progress (Issues completed) | 3 / 14 (21.4%) as of 2026-08-01 — `#384` (Critical `APP_KEY` exposure, PR #393), `#385` (SonarCloud cleanup, PR #391), and `#358` (Attendance Today "Ausentes" bug, PR #395) implemented; all open, ready for merge |

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
| — | — | — | — | No scope changes yet — sprint just started, no work has been picked up |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-07-31 | #388 | Add /issue slash command for end-to-end autonomous issue delivery | Already implemented ad hoc while working the sprint's issue-delivery workflow; filed and tracked here after the fact rather than left undocumented | `.claude/commands/issue.md` added, PR #389 open |

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
| ✅ | #384 | Remove hardcoded APP_KEY from docker-compose.prod.yml and docker-compose.preview.yml | Critical | 1h | 2h | 0.6h | PR #393 | Hardcoded key removed from both compose files, rotation process documented; live Cloud Run rotation deferred (needs GCP access) — PR ready, merge pending |
| ⏳ | #377 | Build a unified media upload system (Storage-backed, cloud-swappable) | High | 4h | 8h | — | — | No dependencies; unblocks #378 (Round 2) |
| ⏳ | #379 | Build the Platillos (dishes) backend domain: categories, dishes, extras | High | 5h | 10h | — | — | Soft dependency on #377 (photos only, not tables/CRUD) — safe to run in parallel; unblocks #381 (Round 2) |
| ✅ | #358 | Employees on vacation or a scheduled rest day today don't appear under "Ausentes" | High | 3h | 6h | 5.2h | PR #395 | `today_vacation` backend field + `isAbsentRow`/`isHiddenFromGrid` frontend fallback; PR ready, merge pending |
| ⏳ | #360 | Migrate remaining now()/new Date() usages to ApplicationClock | Medium | 4h | 8h | — | — | Wide file surface (Leaves/CashAdjustments/Inventory backend, Employees frontend hooks) but none overlap other sprint Issues |
| ⏳ | #383 | Migrate Payroll Periods list/detail tables to the shared DataGrid component | Medium | 3h | 6h | — | — | `attendance/payroll/*`; independent of #382 (different route) |
| ⏳ | #382 | Migrate the daily report employee table to the shared DataGrid component | Medium | 2h | 4h | — | — | `attendance/reports/*`; independent of #383 |
| ⏳ | #357 | Unify card exit/transition animation across all Attendance Today state changes | Medium | 2h | 4h | — | — | `attendance/index.tsx` + `-use-today-attendance-page.ts`; distinct files from #358 |
| ⏳ | #365 | [Convention] Run only linters + delivered tests locally; leave full-suite regression check to CI | Medium | 1h | 2h | — | — | Docs only (`doc/conventions/`, `doc/TESTING.md`); no estimate in Issue body — agent-estimated, see §12 |
| ✅ | #385 | Clear SonarCloud code-smell debt: mark webapp InfoItem/PropertyItem props as Readonly | Low | 0.5h | 1h | 0.2h | PR #391 | `inventory/item-details.tsx`, `location-details.tsx`, `variant-details.tsx`; conflict-free filler; PR ready, merge pending |
| ⏳ | #376 | Remove Insumo/Activo from item Type selector — Inventory scoped to resale products only | Low | 0.5h | 1h | — | — | `inventory/item-form.tsx`, `product-wizard.tsx`; conflict-free filler |
|  |  | **Round total** |  | **26h** | **52h** | **—** |  |  |

### Round 2 — Platillos: seed data and uploader component

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #378 | Build a reusable media gallery uploader component (frontend) | High | 3h | 6h | — | — | Hard dependency: needs #377's upload endpoint merged |
| ⏳ | #381 | Seed Platillos (dishes) data — Testing/Fakes/Development | Medium | 2h | 4h | — | — | Hard dependency: needs #379's tables/models merged |
|  |  | **Round total** |  | **5h** | **10h** | **—** |  |  |

### Round 3 — Platillos: catalog UI

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #380 | Build the Platillos (dishes) catalog UI — replaces the /productos stub | High | 5h | 10h | — | — | Hard dependency: needs both #379 (Round 1) and #378 (Round 2) merged |
|  |  | **Round total** |  | **5h** | **10h** | **—** |  |  |

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
| Round 1 | 11 | 26h | 52h | — | — | — |
| Round 2 | 2 | 5h | 10h | — | — | — |
| Round 3 | 1 | 5h | 10h | — | — | — |
| **Grand total** | **14** | **36h** | **72h** | **—** | **—** | **—** |

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Planning and issue scoping | — | — | — |
| Implementation | 36h–72h | — | — |
| Code review and validation | — | — | — |
| Documentation | — | — | — |
| Rework and corrections | — | — | — |
| **Total** | **36h–72h** | **—** | **—** |

### Wall-Clock Time & Parallelism

This is a cross-file pointer to `doc/conventions/sprints.md` §7 (Time and Duration Rules) for the
"Wall-clock time and parallelism" definitions and computation rules — not a same-document §7,
since this document numbers its own §7 as Route A — Execution Rounds instead.

- **Person-hours:** — (computed at sprint closure from logged sessions)
- **Wall-clock time:** —
- **Parallelization factor:** —
- **Peak concurrency:** —

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|

## 12. Notes on Estimate Confidence

- 13 of 14 Issues carry an explicit `**Optimistic:**`/`**Pessimistic:**` pair in their own
  `## ⏱️ Time` section — those values were copied verbatim into §7/§10.
- `#365` has **no** `## ⏱️ Time` section in its Issue body at all (it predates or was drafted
  outside the Time convention). Its 1h/2h estimate in this document is agent-generated, based on
  scope (three documentation files, no code) — treat it as low-confidence until re-estimated by
  whoever picks it up, and correct the Issue itself to add a proper `## ⏱️ Time` section before
  starting.
- `#360`'s Issue body itself carries a caveat: it was drafted alongside `#113` and never migrated
  off a local backlog file until now, so its "Known violations" file list "may be stale" — the
  Issue instructs re-running `scripts/lint-clock-usage.sh` before starting. The 4h/8h estimate
  assumes the listed violations are still current; re-scope if the script reports a materially
  different count.
- All other estimates are Issue-author scoping estimates (technical, file-list-backed), not rough
  sizing — confidence is high for Round 1's smaller items (#384, #385, #376) and moderate for the
  larger Platillos Issues (#377, #379, #380), which are new-domain work with more unknowns than a
  migration or bug fix.

## 13. Execution Evidence

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|
| ✅ | #384 | Removed the leaked hardcoded `APP_KEY` from `docker-compose.prod.yml`/`docker-compose.preview.yml`, sourced from a required env var, and documented the generate/rotate process — PR open, not yet merged | PR #393 | — | 0.6h | 1 Copilot review round (require APP_KEY, fail fast) + Devin/DeepWiki scan 0 bugs; live Cloud Run key rotation deliberately deferred (needs GCP project access outside this automation) — PR ready, merge pending |
| ⏳ | #377 | Not started | — | — | — | — |
| ⏳ | #379 | Not started | — | — | — | — |
| ✅ | #358 | Added `today_vacation` to `TodayAttendanceController`'s response and updated `isAbsentRow`/`isHiddenFromGrid` so vacation/scheduled-rest-day employees classify as "Ausente" from the start of the day without an Attendance record — PR open, not yet merged | PR #395 | — | 5.2h | 25 new/updated PHPUnit assertions, 248 Vitest passing, 5/5 new + 15/15 regression Cypress specs (dev-lab E2E stack); Copilot review fixed 1 real defect (fallback misclassifying an actively-working employee); Devin/DeepWiki review surfaced 1 legitimate UX tradeoff (rest-day visibility in default grid), resolved via a user decision rather than a silent code change; CI 13/13 green — PR ready, merge pending |
| ⏳ | #360 | Not started | — | — | — | — |
| ⏳ | #383 | Not started | — | — | — | — |
| ⏳ | #382 | Not started | — | — | — | — |
| ⏳ | #357 | Not started | — | — | — | — |
| ⏳ | #365 | Not started | — | — | — | — |
| ✅ | #385 | Wrapped `PropertyItem`/`InfoItem` props in `Readonly<...>` across 3 inventory detail components, clearing all 4 open SonarCloud `typescript:S6759` code smells | PR #391 | — | 0.2h | Pure type-annotation change, no runtime behavior change; 24/24 existing Vitest tests passing, lint + typecheck clean; CI 12/12 green, Copilot 0 comments, Devin/DeepWiki 0 bugs/0 flags on first push; PR ready, merge pending |
| ⏳ | #376 | Not started | — | — | — | — |
| ⏳ | #378 | Not started | — | — | — | — |
| ⏳ | #381 | Not started | — | — | — | — |
| ⏳ | #380 | Not started | — | — | — | — |
| ✅ | #388 (Opportunistic, §5.4) | Added `/issue` slash command composing `/start-issue`, `/pr-comments`, and `/finish-pr` into a single autonomous delivery pipeline — PR open, not yet merged | PR #389 | — | 9.43h | 6 Copilot review rounds + 6 Devin/DeepWiki scan rounds, all defects resolved (no business-rule disputes); PR ready, merge pending |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Tests passing | — | 100% | — | ⏳ |
| Coverage | — | ≥80% new code (both projects) | — | ⏳ |
| SonarCloud Issues | 4 code smells (webapp) | 0 | — | ⏳ |
| Technical debt | 20min (webapp) | 0 | — | ⏳ |
| Bugs fixed | 0 | 1 (#358) | — | ⏳ |
| Security findings | 1 known (compromised APP_KEY) | 0 new, 1 rotated | — | ⏳ |

## 15. Results

### 15.1 Delivered Value

_To be completed at sprint closure._

### 15.2 Planned vs. Actual

_To be completed at sprint closure._

### 15.3 Known Limitations

_To be completed at sprint closure._

## 16. Lessons Learned

_To be completed at sprint closure._

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| — | — | — | No follow-up work identified yet — sprint has not started | — |

## 18. Sprint Closure Checklist

- [ ] All included work items have a final status marker.
- [ ] Completed items include Pull Request or commit evidence.
- [ ] Deprecated items identify their replacement.
- [ ] Cancelled items include a reason.
- [ ] Scope changes are recorded.
- [ ] Tracked time was synchronized from Issue sessions.
- [ ] Round totals and sprint totals were recalculated.
- [ ] Estimate variance was calculated.
- [ ] Consolidated effort was completed.
- [ ] Wall-clock time, parallelization factor, and peak concurrency were computed (`doc/conventions/sprints.md` §7).
- [ ] Dependencies reflect actual execution.
- [ ] Conflict notes reflect actual execution.
- [ ] Tests and relevant quality metrics were recorded.
- [ ] Delivered value and known limitations were documented.
- [ ] Follow-up work was created or recorded.
- [ ] Lessons learned were captured.
- [ ] Metadata dates and status were updated.
- [ ] The next sprint was promoted or created when applicable.
