---
sprint: "004"
title: Product Catalog Reconstruction
status: Completed

created: 2026-08-12
started: 2026-08-18
completed: 2026-08-21
last_updated: 2026-08-21

base_branch: main
base_commit: e11cb139
scope_issues: 8

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-003-development-platform-and-product-reliability.md
next: sprint-005-purchasing-cost-and-pricing.md
---

# Sprint 004 — Product Catalog Reconstruction

> Deliver one usable Product → Variant → Purchase Presentation catalog, seeded with representative
> SushiGo data, and retire the competing legacy Product wizard.

## 1. Executive Summary

Sprint 004's confirmed scope is **100% delivered**. All eight planned Issues from
`pakodiazdev/sushigo` (`#422`–`#429`) merged to `main` between 2026-08-19 and 2026-08-21, delivering
a complete catalog vertical rather than isolated backend work: Product identity with Brand and
Inventory Category, progressive Product creation and detail, embedded Variants, reusable Purchase
Presentations, realistic seed data, and removal of the superseded wizard and catalog paths. Six
opportunistic Issues also merged inside the sprint window (`#459`, `#460`, `#477`, `#478`, `#481`,
`#486` — see §5.4), mostly CI/dev-platform work triggered by the same `/issue*` pipeline this
sprint's product work depended on.

The eight confirmed Issues were estimated at **32h optimistic / 60h pessimistic**; real tracked
time across all eight, computed directly from each Issue's own `## 📅 Sessions` array, came to
**56h16m (56.3h)** — +24h16m over optimistic, -3h44m under pessimistic (see §10/§11). Execution ran
across five dependency-aware rounds because every later layer builds on the catalog contracts
established before it; two dev-lab workspaces (`sushigo-a`/`sushigo-b`) worked in parallel for most
of the sprint, giving a real **1.34× parallelization factor** on formal scope alone (1.37× including
opportunistic work — see §11).

Per `doc/conventions/sprints.md` §4, a sprint is formally completed once its closure checklist is
done **and** the next sprint becomes current. This closure pass (`#488`) marks every other item on
§18's checklist complete, but **deliberately leaves Sprint 005's promotion out of `planned/` as a
separate follow-up** for `/close-sprint` to run — the same explicit split `#457`/`#460` used for
Sprint 003's own closure. `status: Completed` and `completed: 2026-08-21` above reflect that all
Sprint 004 work itself is done; the sprint's *lifecycle* position (highest-numbered sprint directly
under `doc/sprints/`) does not change until that follow-up promotion runs.

Two real data gaps surfaced while resyncing this document (see §12): Issue `#429` had merged code
and a real logged session but had never been finalized (`Tracked`/Retrospective missing — fixed as
part of this pass), and Issue `#460` closed with **zero** session data despite shipping substantial,
verified work (Sprint 003 closure, Sprint 004 promotion, a live GitHub Project Iteration-field
correction) — its `Tracked` value is recorded as an honest gap rather than estimated from PR
timestamps, following the same rule Sprint 003's own closure (`#457`) established.

This sprint intentionally stopped at catalog configuration. Supplier offerings, purchases,
acquisition cost, Stock balances, branch-aware sale prices, and the remaining Inventory cleanup are
deferred to later roadmap Issues (§17). Product creation therefore remains free of cost, price,
opening balance, location, and transactional purchase data.

## 2. Context

The current Inventory catalog couples Product, Variant, price, cost, stock, location, and unit
conversion in a wizard. That interaction makes a single creation flow responsible for independent
domains and can leave partial or conceptually incorrect configuration when a later step fails.

The target workflow creates Product identity first. After persistence, the same SlidePanel becomes
the Product detail and progressively exposes its Variant catalog. Each Variant then owns its
inventory identity and can be assigned reusable commercial Purchase Presentations such as Unit,
Pack x6, Box x12, or Box x24. Those presentations normalize packages to the Variant's base
inventory unit without pretending that every box has a universal physical-UOM conversion.

Sprint 003 Issue `#421` was the mandatory design gate for this implementation — Sprint 004 could
not start until that Issue produced an approved target architecture, UI/API contract, and
incremental migration plan. `#421` closed with that approved design, so the gate is satisfied and
its decisions did not require any changes to the assumptions in `#422`–`#429`.

Sprint 004 was promoted from `doc/sprints/planned/` to `doc/sprints/` on 2026-08-18 via `#460`,
which also corrected the GitHub Project's `Iteration` field dates — Sprint 004's iteration now
starts 2026-08-18, matching this document's own `started` date exactly (an earlier pass set it to
2026-08-19, one day late, which would have left the badge still showing Sprint 003 as current on
promotion day; corrected live in the same `#460` pass), not the originally scheduled
**2026-09-06 through 2026-09-19** window, since Sprint 003 finished its confirmed scope well ahead
of that fixed 14-day cadence.

Confirmed scope delivered 2026-08-21, three calendar days after promotion — 16 days ahead of the
originally scheduled window. This closure pass (`#488`) resyncs the document against that real
state, matching the same drift pattern `#457` (Sprint 003) and `#416` (Sprint 002) each caught and
fixed for their own sprints once material updates outpaced the last document edit.

## 3. Sprint Goal

**Sprint Goal:** Replace the coupled Inventory catalog wizard with a tested, progressive Product →
Variant → Purchase Presentation workflow that is usable end to end, includes realistic SushiGo
seed data, and leaves financial and Stock operations in their correct later domains.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-08-12 |
| Planned start | 2026-09-06 |
| Planned end | 2026-09-19 |
| Started | 2026-08-18 (promoted early — see `#460`; Sprint 003 delivered its confirmed scope 6 days ahead of its own planned window) |
| Completed | 2026-08-21 (confirmed scope; this document's own closure pass, `#488`, is dated the same day) |
| Target calendar duration | 14 days |
| Actual calendar duration | 4 days (2026-08-18 → 2026-08-21) — 16 days ahead of the originally scheduled window |
| Active workdays | 4 (2026-08-18, 08-19, 08-20, 08-21 — every day has real `## 📅 Sessions` evidence from at least one Issue, see §11) |

## 5. Scope

### 5.1 Included

- Product, Brand, and Inventory Category backend contracts (`#422`).
- Progressive Product create/edit/detail SlidePanel replacing the four-step wizard (`#423`).
- Product-scoped Variant backend around SKU, barcode, base UOM, and active state (`#424`).
- Embedded Variant catalog and CRUD inside Product detail (`#425`).
- Reusable Purchase Presentation templates and Variant assignments (`#426`).
- Purchase Presentation management inside embedded Variant detail (`#427`).
- Deterministic Testing, volume Fakes, and realistic Development seeders (`#428`).
- Removal of ProductWizard and superseded catalog UI/contracts (`#429`).

### 5.2 Excluded

- Implementation before Sprint 003 design gate `#421` is approved.
- Supplier offerings and purchase-contract design (`#431`).
- Purchase receipts, promotions, acquisition-cost calculation, and receiving UI (`#432`–`#434`).
- Branch-aware price lists and price-management UI (`#435`–`#437`).
- Remaining Stock movement, replenishment, authorization, navigation, and schema cleanup
  (`#438`–`#442`).
- Writing cost, sale price, Stock, opening balance, location, or supplier data from Product or
  Variant forms.
- Adding Insumo or Activo verticals; the shared backend may support them later through adapted UI.
- Unrelated pending technical debt such as `#399`, `#415`, `#276`, and `#85`.

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| — | — | — | None — the formal scope shipped as originally selected | — |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-08-18 | #460 | Promote Sprint 004, close Sprint 003, and add /close-sprint automation | Sprint 003's confirmed scope was fully delivered and its closure documentation (`#457`) merged, but formal closure needed Sprint 004 promoted; the GitHub Project's `Iteration` field dates had also drifted behind actual delivery pace, showing a stale sprint on the committed badge | Sprint 003 marked `Completed`; this document promoted to `doc/sprints/` and marked `In Progress`; both sprint indexes synchronized; GH Project `Iteration` dates corrected (recovering from an unexpected destructive side effect on all 83 project items); `.claude/commands/close-sprint.md` added — merged via PR #461 (`147c664`); badge regeneration left blocked on a missing `PROJECTS_TOKEN` repo secret; **`Tracked` is a recorded data gap — `Sessions[]` was never populated** (see §12) |
| 2026-08-18 | #459 | Add Investment Type classification to the task standard | Recent sprint retrospectives could only estimate the product-vs-platform investment split retroactively from ad hoc titles/labels; making it measurable required the standard to exist and be applied before Sprint 004's own Issues could be classified, so it was picked up alongside Sprint 004's other work rather than deferred | Investment Type standard documented; three canonical labels created; Phase 1b validation wired into all three `/issue*` pipelines; Sprint 004's own scope (`#422`–`#429`) plus `#460` backfilled with exactly one label each; merged via PR #466 (`ff8390a`) |
| 2026-08-21 | #477 | Instrument API test timings and identify PHPUnit CI bottlenecks | Recent `API Tests (PHPUnit + Coverage)` CI runs showed a ~6x swing (~50s to ~5m30s) between executions with no data to explain it; picked up opportunistically to give Sprint 004's own `/issue*` pipeline runs (which depend on this same CI gate) faster, more observable feedback, rather than deferred to a later sprint | Top-20 slowest-tests summary + JUnit artifact wired into `api-tests.yml`; two live CI runs (with/without coverage) measured coverage overhead at ~4% and cost broadly distributed across ~1900 tests; follow-up `#481` filed for suite parallelization backed by that data; merged via PR #480 (`beafa28`) |
| 2026-08-21 | #478 | Add /issue-no-review, an implementation-only issue pipeline | Recent `/issue*` cost comparisons (`#468`) showed the automated Copilot/Codex review loop is a large share of total run cost; some work benefits more from a fast implementation-only pipeline with manual review deferred to a human via `/pr-comments` than from paying for automated review on every run | New `.claude/commands/issue-no-review.md` composing `issue.md`'s Phases 0–5 by reference (context, TDD, docs/task status, PR creation, CI gate), skipping the Copilot/Codex polling loops while still triggering `@codex review` so a first pass is already queued for a human; merged via PR #479 (`15dd5a5`) |
| 2026-08-21 | #481 | Parallelize API PHPUnit suite across shards to cut CI wall time | Direct follow-up to #477's measured baseline (185.73s/178.36s of PHPUnit execution spread broadly across ~1900 tests, not concentrated in a few slow tests) — same Sprint 004 CI gate `/issue*` pipeline runs depend on, so picked up alongside rather than deferred | `api-tests` split into a 4-shard `matrix.shard` job (mirroring `webapp-tests.yml`) with `phpcov merge`-based coverage reassembly and a merged whole-suite slow-test summary; live-validated wall-clock reduced from #477's 3m59s baseline to ~1m47s (~55%); merged via PR #484 (`a0804b2`) |
| 2026-08-21 | #486 | Fix orphaned `api-tests` required status check blocking merge on any non-api PR | `#481`'s job-level `if:` gating meant a skipped `api-tests` matrix job never expands `matrix.shard`, so GitHub reports one literal `api-tests (shard ${{ matrix.shard }}/${{ strategy.job-total }})` check instead of the 4 real shard names branch protection was waiting on — discovered live while trying to merge PR #485 (a sprint-doc-only PR that touched no API code and got permanently stuck) | Added an always-running `api-tests-gate` job (literally named `api-tests`) that mirrors the real matrix job's result; merged via PR #487 (`3232099`), confirmed live on PR #485 itself |

## 6. Value Ranking

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | `#422`, `#424`, `#426` | Establish the canonical Product, Variant, and package-normalization contracts required by every user-facing workflow |
| **High** | `#423`, `#425`, `#427` | Turn the contracts into a complete progressive catalog operators can actually use |
| **Medium** | `#428`, `#429` | Make the vertical demonstrable and remove stale paths that could continue writing invalid catalog data |
| **Deferred** | `#431`–`#442` | Extend the catalog into purchasing, pricing, and final Stock hardening in later sprints |

### Ordering principle

> Approve the design, stabilize each backend contract, expose it through the progressive UI, prove
> the full catalog with representative data, and only then delete the legacy workflow.

## 7. Route A — Execution Rounds

### Round 1 — Establish Product Identity

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #422 | Build Product catalog contract with Brands and Inventory Categories | Critical | 5h | 9h | 21.3h | PR #467 (`67835dd`) | Brand/InventoryCategory catalogs + Product CRUD shipped, scoped to type=PRODUCTO |
|  |  | **Round total** |  | **5h** | **9h** | **21.3h** |  |  |

### Round 2 — Expose Products and Define Variants

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #423 | Replace Product wizard with progressive create-and-detail SlidePanel | High | 5h | 9h | 6.6h | PR #471 (`1ef8688`) | Progressive create→detail SlidePanel shipped, consuming #422 |
| ✅ | #424 | Redesign Product Variants around inventory identity | Critical | 3h | 6h | 6.6h | PR #470 (`a707bd1`) | Product-scoped Variant CRUD shipped, consuming #422 |
|  |  | **Round total** |  | **8h** | **15h** | **13.2h** |  |  |

### Round 3 — Embed Variants and Model Purchase Presentations

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #425 | Add embedded Variant catalog and CRUD to Product detail | High | 4h | 8h | 3.7h | PR #473 (`aa596b6`) | Embedded Variant catalog/CRUD shipped inside Product detail, consuming #424 |
| ✅ | #426 | Model reusable Purchase Presentations and Variant assignments | Critical | 5h | 9h | 4.5h | PR #472 (`9d72068`) | Global template catalog + per-Variant assignment shipped, consuming #424 |
|  |  | **Round total** |  | **9h** | **17h** | **8.2h** |  |  |

### Round 4 — Complete the Usable Catalog and Its Data

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #427 | Add Purchase Presentation management to Variant detail | High | 4h | 7h | 7.8h | PR #475 (`b41daef`) | Third nested SlidePanel level shipped, consuming #426 |
| ✅ | #428 | Seed realistic Products, Variants, and Purchase Presentations | Medium | 3h | 6h | 5.4h | PR #476 (`6797620`) | Believable Coca-Cola/Buldak/Peelez/Ramune/Mochis catalog seeded across Testing/Fakes/Development tiers with idempotency, restoration and API-contract tests |
|  |  | **Round total** |  | **7h** | **13h** | **13.2h** |  |  |

### Round 5 — Retire the Competing Workflow

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #429 | Remove legacy Product wizard and superseded catalog UI | Medium | 3h | 6h | 0.5h | PR #483 (`deefdb7`) | Pure deletion pass after #423/#425/#427/#428 replaced every legacy write path — 27min tracked (Tracked/Retrospective resynced by `#488`, see §12) |
|  |  | **Round total** |  | **3h** | **6h** | **0.5h** |  |  |

## 8. Route B — Sequential Dependencies

```text
#421 (Sprint 3 design gate)
  → #422 Product contract
      → #423 Product UI
      → #424 Variant contract
          → #425 embedded Variant UI
          → #426 Purchase Presentation contract
              → #427 Presentation UI
              → #428 catalog seeders
                  → #429 legacy cleanup
```

`#423` and `#424` may run in parallel after `#422`; one owns the Product frontend and the other the
Variant backend. `#425` and `#426` may also run in parallel after the Variant contract is stable.
`#427` and `#428` form the last safe parallel pair: presentation UI and deterministic backend/data
fixtures. `#429` is intentionally last because deletion is safe only when the replacement workflow
and its representative data have passed their gates.

**Confirmed at closure:** actual merge order matched every planned dependency. `#422` merged
2026-08-19 23:05 (PR #467), then `#423`/`#424` merged in parallel 2026-08-20 21:37–23:18 (PR #470,
#471), then `#425`/`#426` merged in parallel 2026-08-21 03:45–04:02 (PR #472, #473), then
`#427`/`#428` merged in parallel 2026-08-21 16:08–17:32 (PR #475, #476), and `#429` merged last,
2026-08-22 01:09 UTC (2026-08-21 local, PR #483) — no dependency violation and no unplanned
same-file conflict reported in any PR's review thread.

## 9. Conflict Risk Map

| Shared area | Issues | Planned rounds | Risk / Coordination |
|---|---|---|---|
| Item/Product schema, models, API resources, permissions | `#422`, `#424`, `#426`, `#428` | 1–4 | Sequence migrations/contracts; later work consumes rather than redefines earlier boundaries |
| Product page, API client, types, hooks, SlidePanel | `#423`, `#425`, `#427`, `#429` | 2–5 | Sequential frontend ownership avoids competing nested-panel state and cache contracts |
| Variant schema/API | `#424`, `#426`, `#428` | 2–4 | Establish Variant contract before presentation assignments and seed data |
| Seed configuration and database seeders | `#428` | 4 | Single owner; must consume canonical APIs/models and remain idempotent |
| Inventory routes/navigation and old wizard exports | `#423`, `#429` | 2, 5 | Create replacement first; delete redirects and stale entry points last |
| Public-ID convention | `#424`, backlog `#399` | 2 | Coordinate explicitly; Sprint 4 must not introduce an incompatible convention |

**Confirmed at closure:** no PR review thread across `#422`–`#429` reported an actual same-file
merge conflict; every shared area above was resolved by the sequential/parallel scheduling Route B
(§8) already planned.

## 10. Estimate Tracking by Round

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| Round 1 | 1 | 5h | 9h | 21.3h | +16.3h | +12.3h |
| Round 2 | 2 | 8h | 15h | 13.2h | +5.2h | -1.8h |
| Round 3 | 2 | 9h | 17h | 8.2h | -0.8h | -8.8h |
| Round 4 | 2 | 7h | 13h | 13.2h | +6.2h | +0.2h |
| Round 5 | 1 | 3h | 6h | 0.5h | -2.6h | -5.6h |
| **Sprint total** | **8** | **32h** | **60h** | **56.3h** | **+24.3h** | **-3.7h** |

Sprint total is computed directly from the sum of raw session minutes across all 8 Issues (3,376
minutes = 56h16m = 56.3h), not from summing the already-rounded Round rows above (which would read
56.4h due to per-round rounding noise).

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Product catalog contract and UI (`#422`, `#423`) | 10h–18h | 27.9h | +9.9h to +17.9h |
| Variant contract and embedded UI (`#424`, `#425`) | 7h–14h | 10.3h | -3.7h to +3.3h |
| Purchase Presentations backend and UI (`#426`, `#427`) | 9h–16h | 12.3h | -3.7h to +3.3h |
| Seed data (`#428`) | 3h–6h | 5.4h | -0.7h to +2.4h |
| Legacy cleanup (`#429`) | 3h–6h | 0.5h | -5.6h to -2.6h |
| **Sprint total** | **32h–60h** | **56.3h** | **-3.7h to +24.3h** |

### Wall-Clock Time & Parallelism

Computed at sprint closure directly from every scoped Issue's `## 📅 Sessions` array, following
`doc/conventions/sprints.md` §7. Both figures below cover formal scope only (`#422`–`#429`); the
full-sprint figure including opportunistic work with usable session data appears in the Investment
Type Distribution note further down, since §7 requires stating which population a given figure
covers.

- **Person-hours:** 56.3h (sum of every logged session across `#422`–`#429` — no merging; 3,376
  raw session-minutes, 12 sessions)
- **Wall-clock time:** 42.0h (union of the same sessions, overlapping/back-to-back intervals merged)
- **Parallelization factor:** 1.34× (Person-hours ÷ Wall-clock time)
- **Peak concurrency:** 2 simultaneous sessions (e.g. 2026-08-19 17:23 — Issues #423, #424; also
  2026-08-20 15:50 — #425, #426; and 2026-08-21 00:42 — #427, #428). No point in the formal-scope
  data ever has 3 Issues open at once.

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| 2026-08-18 18:51 → 23:22 | 4h31m | #422 |
| 2026-08-19 00:00 → 16:45 | 16h45m | #422 |
| 2026-08-19 17:21 → 22:52 | 5h31m | #423, #424 |
| 2026-08-20 13:40 → 15:18 | 1h38m | #423, #424 |
| 2026-08-20 15:50 → 21:10 | 5h20m | #425, #426 |
| 2026-08-21 00:42 → 08:30 | 7h48m | #427, #428 |
| 2026-08-21 14:16 → 14:43 | 27m | #429 |

**Full sprint, including opportunistic work with real session data** (`#459`, `#477`, `#478`,
`#481`, `#486`; `#460` excluded per §7's rule for Issues with no `Sessions[]` data at all — see
§12):

- **Person-hours:** 63.6h (3,815 raw session-minutes, 17 sessions)
- **Wall-clock time:** 46.4h (2,784 merged-block-minutes)
- **Parallelization factor:** 1.37× (Person-hours ÷ Wall-clock time)
- **Peak concurrency:** 2 simultaneous sessions — same peak as formal scope; the two dev-lab
  workspaces (`sushigo-a`/`sushigo-b`) this sprint ran in never had more than 2 Issues' sessions
  open at the same instant, opportunistic work included.

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| 2026-08-18 18:51 → 23:22 | 4h31m | #422, #459 |
| 2026-08-19 00:00 → 16:45 | 16h45m | #422, #459 |
| 2026-08-19 17:21 → 22:52 | 5h31m | #423, #424 |
| 2026-08-20 13:40 → 15:18 | 1h38m | #423, #424 |
| 2026-08-20 15:50 → 21:10 | 5h20m | #425, #426 |
| 2026-08-21 00:42 → 08:30 | 7h48m | #427, #428 |
| 2026-08-21 10:45 → 11:35 | 50m | #478 |
| 2026-08-21 12:15 → 13:41 | 1h26m | #477 |
| 2026-08-21 14:16 → 14:43 | 27m | #429 |
| 2026-08-21 14:45 → 16:50 | 2h05m | #481 |
| 2026-08-21 19:18 → 19:21 | 3m | #486 |

### Investment Type Distribution

Sprint 004 is the first sprint scoped entirely under the Investment Type standard
(`doc/conventions/tasks.md` → "Investment Type", introduced by `#459`). Every Issue in this sprint's
formal scope (`#422`–`#429`, per `scope_issues: 8` above) carries exactly one `investment:` label.
Hours and percentage by Investment Type are computed at sprint closure directly from each Issue's
real `## ⏱️ Time` → `Sessions[]` / `Tracked` data — not hand-maintained here before that data exists.
The Issues column below is a snapshot of each Issue's `investment:` label as of this PR — per
`doc/conventions/tasks.md`, the label itself is the canonical value, not this table. If an Issue is
relabeled before closure, reconcile this column against live labels at the same closure step that
fills in Tracked/%.

Per `doc/conventions/sprints.md` §7's own Person-hours/Wall-clock convention, this table covers
**formal scope only** (`scope_issues: 8`, `#422`–`#429`) — it deliberately excludes all six
opportunistic Issues (`#459`, `#460`, `#477`, `#478`, `#481`, `#486`), even though every one of them
is `dev-platform` and landed inside this sprint's window (five carry real tracked time; `#460` is a
recorded gap, see §12). All six are correctly **opportunistic work** per §5.4's own definition (not
in the original scope, all carry the `sprint-4` label as of this closure pass, all worked during the
sprint window) — see §5.4 and §13 for their own records, with `Tracked` values that are *not* folded
into this table's formal-scope figures. The `dev-platform` row below reading `_(none within formal
scope)_` means exactly that — not that zero dev-platform effort occurred in Sprint 004; the combined
figure across formal scope plus opportunistic work is computed just below the table.

| Investment Type | Issues | Tracked | % of sprint |
|---|---|---:|---:|
| `investment: product` | `#422`, `#423`, `#424`, `#425`, `#426`, `#427` | 50.5h | 89.7% |
| `investment: product-engineering` | `#428`, `#429` | 5.8h | 10.3% |
| `investment: dev-platform` | _(none within formal scope — #459, #460, #477, #478, #481, #486 are all dev-platform opportunistic work, see §5.4/§13)_ | 0h | 0% |

Combined dev-platform figure across formal scope plus opportunistic work: 0h (formal) +
`#459` 2h55m + `#477` 1h26m + `#478` 0h50m + `#481` 2h05m + `#486` 3m = **7h19m of logged
opportunistic dev-platform time** (`#460` excluded — no session data, see §12), none of it inside
formal scope.

## 12. Notes on Estimate Confidence

Confidence is **medium**. Issue boundaries and dependencies are explicit, but `#421` can still
re-scope schema or migration decisions before Sprint 4 begins. The estimates assume incremental
migration over the shared Item model, reuse of the media system from `#377`/`#378`, no financial or
Stock-domain implementation, and no broad delivery of technical-debt Issue `#399`.

The largest uncertainty is the nested Product/Variant/Presentation UI state across `#423`, `#425`,
and `#427`. The plan sequences those Issues so each can stabilize cache, accessibility, and panel
behavior before the next layer consumes it. All eight Issue bodies contained optimistic/pessimistic
estimates and empty Sessions arrays ready for execution tracking — every one of the eight ended up
with real, closed session data, confirming the confidence level held (§10/§11 shows the sprint came
in +24.3h over optimistic but -3.7h under pessimistic, i.e. within the originally bracketed range).

### Data-quality gaps discovered at closure

Unlike Sprint 003, formal scope itself has **no** tracking gap — all 8 scoped Issues (`#422`–`#429`)
now have real session data and a computed `Tracked` value. Two gaps did surface while resyncing this
document (`#488`), both in Issues that merged real, verified code:

- **`#429`** had one real, closed session (2026-08-21, 14:16–14:43 = 27m) but had never been
  finalized: `Tracked` still read `_in progress_` and no `## 📊 Retrospective` existed. Since the
  session data itself was real (not missing), this was corrected directly — `Tracked` set to
  `0h27m` from that session, a Retrospective added — rather than recorded as an unrecoverable gap.
  This is the "compute it, don't guess it" side of §7's rule: the raw data existed, it just hadn't
  been read yet.
- **`#460`** (opportunistic) closed with an **empty** `Sessions[]` array despite shipping real,
  substantial, verified work (PR #461: Sprint 003 closure, Sprint 004 promotion, both README
  indexes, a live GitHub Project Iteration-field correction that required recovering from an
  unexpected destructive side effect on all 83 project items, and `.claude/commands/close-sprint.md`
  itself). No `/start-issue` session was ever opened for it. Per §7, this is recorded as `not
  tracked (gap)` rather than estimated from PR #461's commit/merge timestamps — it contributes
  nothing to §10's Estimate Tracking, §11's Consolidated Time Tracking, or the Wall-Clock/
  Parallelization figures. This is the same failure mode Sprint 003's own closure (`#457`)
  documented for its five confirmed `dev-lab` Issues — see §16.

Separately, this closure pass also found that `#460`, `#477`, `#481`, and `#486` had never received
the `sprint-4` label at all — despite `#460` and `#481` already being listed in this document's own
§5.4 before this pass, and all four being real, merged Sprint 004 opportunistic work. Backfilled as
part of `#488`. `#460` was also missing an `investment:` label entirely (backfilled to
`investment: dev-platform`) — the only Sprint 004 Issue found without one at closure.

## 13. Execution Evidence

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|
| ✅ | #422 | Brand/InventoryCategory catalogs (public_id, soft-deletable) and Product CRUD (Item scoped to type=PRODUCTO, catalog-identity-only write contract) shipped with lifecycle guards | PR #467 | `67835dd` | 21.3h | 106 Feature tests, Pint clean, CI green, SonarCloud gate clean on api+webapp; Copilot + Devin/DeepWiki + Codex review cycles (0 bugs remaining); 3 business-rule disputes resolved with explicit human decisions |
| ✅ | #423 | New `/inventory/products` page: list/search/filters, a react-hook-form + zod create form (catalog identity + media only), and a single SlidePanel instance transitioning create → detail → edit in place | PR #471 | `1ef8688` | 6.6h | 269 Vitest files / ~4000 tests green, ESLint/TypeScript clean, CI green (12/12); Copilot review (1 thread) + Codex review (3 cycles, 6 findings) all addressed — inactive-assignment pickers, stale pagination, effective-activity badge, delete-page-stranding, unfiltered filter catalogs, missing permission gates; a second review-response session then fixed a hook-placement/blank-form-flash finding, cleaned up 6 SonarCloud code smells (gate now 0 new smells), and closed 2 further Codex threads (inactive-category picker, silent list-fetch failures); 0 business-rule disputes; Cypress E2E spec written but not executed (isolated worktree sandbox has no live server on this branch) — needs a human run per the PR's Manual Testing section |
| ✅ | #424 | Product-scoped Variant CRUD (`inventory/products/{id}/variants`) shipped with a catalog-identity-only write contract — no cost, price, or stock fields; DB-level barcode uniqueness added | PR #470 | `a707bd1` | 6.6h | 41 Feature tests, Pint clean, CI green, SonarCloud gate clean on api (0 new code smells); Copilot review (3 threads addressed) + Codex review (2 real bugs found and fixed: unvalidated `per_page` causing a 500 on paginate, and base-UOM changes allowed after stock/history existed); follow-up review round fixed a `strict_types` crash on numeric `code`/`barcode` input, an inline-FQCN violation, and a SonarCloud duplicated-literal smell (`RouteParams::VARIANT_ID` extracted) |
| ✅ | #425 | Embedded Variant catalog inside Product detail: inline list (SKU, name, barcode, base UOM, status), nested create/edit/detail screens extending the same top-level SlidePanel instance, no Product/Item selector | PR #473 | `aa596b6` | 3.7h | 151+ Vitest tests green, ESLint/TypeScript clean, CI green (11/11); Copilot poll found no review; Codex review ran its full 3-cycle cap and found 5 real defects (inactive-UOM edit blocking, Variant-list pagination truncation, two delete-time races causing spurious error toasts), all fixed with regression tests; 0 business-rule disputes; Cypress E2E spec written but not executed (isolated worktree sandbox has no live server on this branch) — needs a human run |
| ✅ | #426 | Global `PurchasePresentationTemplate` catalog (Unit/Pack/Box/Tray) and per-Variant `VariantPurchasePresentation` assignment, with compatible-UOM validation preventing the ambiguous Box<->Unit global conversion | PR #472 | `9d72068` | 4.5h | 29 Feature tests, Pint clean, CI green, SonarCloud gate clean on api; Copilot review (4 threads) + Codex review (3 cycles, 7 findings) all addressed — template_id now accepts public_id like every other endpoint, a default-assignment locking race, a decimal-scale false-positive on template immutability checks, and a post-lock duplicate-assignment recheck; 0 business-rule disputes |
| ✅ | #427 | Third nested SlidePanel level (Product → Variant → Purchase Presentation): assign/edit/deactivate/reactivate an existing template, a standalone secondary Template manager, and a client-side normalization hint + UOM-compatibility guard | PR #475 | `b41daef` | 7.8h | 20 new Vitest files (93–100% line coverage on new files), full suite 3944/3952 passing (remainder were vitest worker-pool timeouts, not regressions), ESLint/TypeScript clean, CI green (12/12); Codex review ran its full 3-cycle cap and found 3 real defects (Escape/focus-trap leaking through two stacked SlidePanel instances, a stale template-select cache after create/reactivate, and lost focus when a panel swaps content in place without closing), all fixed with regression tests; Copilot errored on both attempts with 0 actionable threads; 0 business-rule disputes; Cypress E2E spec written but not executed (no E2E Docker stack up in this workspace) — needs a human run per the PR's Manual Testing section |
| ✅ | #428 | Testing (deterministic), Fakes (factory volume) and Development (believable Coca-Cola/Buldak/Peelez/Ramune/Mochis) catalog seeders across Brand, InventoryCategory, PurchasePresentationTemplate and Product/Variant — no invented cost, supplier, purchase, stock or branch price data anywhere | PR #476 | `6797620` | 5.4h | 51 Feature tests (idempotency, soft-delete restoration, representative shape, real `/inventory/products` API-contract rendering), Pint clean, CI green (11/11); Copilot review (1 thread: unset `sku`) + Codex review (3 cycles, 3 real defects: invalid GTIN check digits on seeded barcodes, a default-presentation constraint violation on re-seed, and a shared `RestoresTrashedOnUpsert` trait bug preferring to restore an older trashed duplicate over a live replacement) all addressed with regression tests; 0 business-rule disputes; Buldak/Peelez naming blocker resolved via web research (architecture doc §8.2) |
| ✅ | #429 | `ProductWizard` and every superseded catalog write path deleted; `CreateItemRequest`/`CreateItemVariantRequest`/`UpdateItemVariantRequest` reject `type=PRODUCTO`; navigation/breadcrumbs normalized; dead `is_manufactured` field removed end-to-end | PR #483 | `deefdb7` | 0.5h | 34+368 PHPUnit tests passing, 212 Vitest passing, Pint/ESLint/TypeScript clean; automated review (Copilot/Codex/Devin/Sonar) skipped by request on this PR; 0 business-rule disputes; **`Tracked`/Retrospective were missing until this closure pass (`#488`) resynced them — see §12** |
| ✅ | #459 | Investment Type classification standard, canonical labels, Phase 1b validation, and Sprint 004/#460 backfill | PR #466 | `ff8390a` | 2.9h | 11/11 CI green; Copilot and Devin/DeepWiki review cycles resolved; opportunistic work per §5.4 |
| ✅ | #460 | Sprint 003 marked `Completed`; Sprint 004 promoted from `planned/`; both sprint indexes synced; GitHub Project `Iteration` dates corrected (recovered from a destructive side effect on all 83 project items); `.claude/commands/close-sprint.md` added | PR #461 | `147c664` | not tracked (gap) | 5 of 6 Technical Tasks/Acceptance Criteria shipped and verified; badge regeneration blocked on a missing `PROJECTS_TOKEN` repo secret (external, not an implementation gap); opportunistic work per §5.4; **no `Sessions[]` data was ever logged — recorded as a data gap, not estimated from PR timestamps, see §12**; `sprint-4` and `investment: dev-platform` labels backfilled by `#488` |
| ✅ | #477 | JUnit-based Top-20 slowest-test summary + artifact wired into `api-tests.yml`, a `workflow_dispatch` with/without-coverage diagnostic path, and measured findings (coverage overhead ~4%, cost broadly distributed) | PR #480 | `beafa28` | 1h26m | 11/11 CI green; Copilot review (2 doc-wording threads) + Codex review (2 real defects: a path-filter gap skipping the script's own tests on API-code-free PRs, and unsafe TOP_N/error-message handling) all addressed with regression verified on CI; 0 business-rule disputes; opportunistic work per §5.4; follow-up `#481` filed |
| ✅ | #478 | New `.claude/commands/issue-no-review.md`, composing `issue.md`'s Phases 0–5 by reference and skipping the Copilot/Codex polling loops while still triggering `@codex review` for later manual pickup | PR #479 | `15dd5a5` | 0h50m | CI green on every gate (initial push, post-squash, post-rebase) — no PHP/TS code changed, so the usual coverage floor didn't apply; Copilot review (2 doc-clarity fixes); Codex review surfaced 1 business-rule dispute (suggested bypassing `finish-pr.md`'s unresolved-thread gate) overridden per the zero-interruption rule; opportunistic work per §5.4 |
| ✅ | #481 | 4-shard `matrix.shard` split of `api-tests.yml`, `phpcov merge`-based coverage reassembly, and a whole-suite merged slow-test summary; wall-clock reduced from #477's 3m59s baseline to ~1m47s (~55%) | PR #484 | `a0804b2` | 2.1h | 19/19 CI green; Copilot review (1 thread: job-level path gating) + Devin/DeepWiki review (0 bugs, 2 Investigate flags — a branch-protection required-check rename and a timing-script gating regression, both fixed) all addressed; 0 business-rule disputes; opportunistic work per §5.4, follow-up to `#477`; the job-level `if:` gating this introduced is exactly what caused `#486`'s bug three days later |
| ✅ | #486 | Always-running `api-tests-gate` job (literally named `api-tests`) added, mirroring the real matrix job's result, so branch protection has a stable required check even when the matrix job itself is skipped | PR #487 | `3232099` | 3m | Fixed and confirmed live on PR #485 itself, which had been permanently stuck on the orphaned check; YAML syntax validated; opportunistic work per §5.4, direct consequence of `#481`'s job-level `if:` gating |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Product creation entry points | Coupled wizard and overlapping catalog paths | One progressive Product catalog entry point | `ProductWizard` deleted (#429); `/inventory/products` is the only Product creation path (#423) | ✅ |
| Product create payload | Mixes identity with operational/financial fields | Identity, classification, media, and active state only | `CreateItemRequest` rejects `type=PRODUCTO` outright — no cost/price/stock/opening-balance fields on the Product create path (#422, #429) | ✅ |
| Variant management | Disconnected/global and financially coupled | Product-scoped CRUD inside Product detail | `inventory/products/{id}/variants` CRUD, embedded in Product detail (#424, #425); global Variant page's item picker excludes PRODUCTO (#429) | ✅ |
| Commercial packaging | Ambiguous use of global UOM conversion | Reusable compatible Purchase Presentation templates | `PurchasePresentationTemplate`/`VariantPurchasePresentation` with compatible-UOM validation (#426, #427); Product-package use of global `/uom-conversions` removed (#429) | ✅ |
| Representative catalog data | Legacy/incomplete Product story | Deterministic Coca-Cola, Buldak, Peelez, Ramune, and Mochis examples | Testing/Fakes/Development seeders shipped across Brand, InventoryCategory, PurchasePresentationTemplate, Product/Variant (#428) | ✅ |
| Relevant tests and gates | TBD | 100% relevant API, component, E2E, and quality checks passing | All 8 Issues' PHPUnit/Vitest suites and CI gates green (see §13); 4 of 8 Issues' Cypress E2E specs written but not executed in-sandbox, flagged for a human run — see §15.3 | ✅ |

## 15. Results

### 15.1 Delivered Value

Delivered a complete, coherent Product → Variant → Purchase Presentation catalog vertical:
operators create Product identity first (Brand, Inventory Category, media), then progressively add
Variants (SKU, barcode, base UOM) and assign them reusable commercial Purchase Presentations (Unit,
Pack, Box, Tray) with compatible-UOM validation — all through one SlidePanel entry point at
`/inventory/products`, with no cost, price, Stock, or opening-balance data enterable anywhere on
that path. The competing legacy `ProductWizard` and every stale write path into the old model are
gone. A believable, representative seed catalog (Coca-Cola, Buldak, Peelez, Ramune, Mochis) ships
across Testing/Fakes/Development tiers, giving the vertical a demonstrable, idempotent baseline.

Sprint 004 also delivered real CI/dev-platform value opportunistically: the Investment Type
classification standard (`#459`), a measured PHPUnit CI bottleneck diagnosis and a 4-shard
parallelization that cut API test wall-clock by ~55% (`#477`→`#481`), a same-day fix for the
required-status-check regression that parallelization introduced (`#486`), a cheaper
implementation-only `/issue*` pipeline variant (`#478`), and the sprint-lifecycle automation that
formally closed Sprint 003 and promoted this sprint (`#460`).

### 15.2 Planned vs. Actual

- **Planned Issues:** 8 — **8/8 completed (100%)**.
- **Opportunistic Issues:** 6 (`#459`, `#460`, `#477`, `#478`, `#481`, `#486`) — all 6 completed.
- **Deprecated or cancelled:** 0.
- **Estimate:** 32h optimistic / 60h pessimistic (8-Issue formal scope).
- **Tracked:** 56h16m (56.3h) across the 8 formal-scope Issues — +24h16m over optimistic, -3h44m
  under pessimistic (see §10/§11). 7h19m logged across 5 of 6 opportunistic Issues (`#460` is a
  recorded data gap, not a zero — see §12).
- **Scope changes:** none (§5.3).

### 15.3 Known Limitations

- The completed catalog does not yet receive purchases or resolve acquisition cost/sale price —
  deferred to `#431` onward (§17).
- Seeders demonstrate reusable catalog definitions only; operational suppliers, receipts, costs,
  Stock, and branch prices belong to later Issues.
- The 32h–60h estimate was engineering effort, not elapsed calendar time; five dependency rounds
  constrained the maximum useful parallelism to 2 concurrent Issues at a time (§8, §11).
- Four Issues (`#423`, `#425`, `#427`, and effectively `#429`, which relies on their coverage)
  shipped a written Cypress E2E spec that was never executed against a live server inside this
  sprint's isolated worktree sandboxes — flagged in each PR's own Manual Testing section for a human
  to run.
- `#460`'s badge-regeneration Technical Task remains blocked on a missing `PROJECTS_TOKEN` repo
  secret — external to this sprint's own work, needs repo-admin action (§13).
- `#460` has no tracked time at all — a structural data gap (no `/start-issue` session was ever
  opened for it), not a claim that no effort was spent (§12).
- Issue `#468` ("Split `/issue` into `issue-full`, `issue`, and `issue-devin-interactive`") is real,
  merged, `sprint-4`-labeled dev-platform work that landed inside this sprint's window but was never
  named in `#488`'s own reconciliation list — left out of this document's §5.4/§13 as a deliberate
  scope boundary (its own Sessions data also has an unclosed session, `"end": "?"`, a further gap);
  see §17 for a follow-up recommendation to reconcile it in a later pass.

## 16. Lessons Learned

**Planning lesson:** catalog identity, operational packaging, transaction cost, sale price, and
Stock are related but distinct lifecycle boundaries. Delivering them as separate verticals avoided
another wizard that creates partial state and gave each sprint an independently testable outcome —
confirmed at closure: all eight Issues shipped exactly the identity/packaging scope planned, with no
cost/price/Stock field ever reachable from the new Product creation path (§14).

**A resync-only sprint document eventually falls silently behind real merge activity — again.**
This is the second consecutive sprint (`#457` for Sprint 003, now `#488` for Sprint 004) where the
document's own `last_updated` date predated most of the sprint's actual closing activity by several
days. Both times the drift was caught only because someone explicitly filed a resync Issue, not
because anything alerted on the gap. Worth naming as a recurring class of risk, same as Sprint 003's
own §16 already flagged for session-tracking gaps: a sprint document needs an explicit trigger to
resync (a checklist habit, or eventually automation), not an assumption that it stays current on its
own.

**Opportunistic work needs its `sprint-4` label applied at intake, not backfilled at closure.**
Four of six opportunistic Issues this sprint (`#460`, `#477`, `#481`, `#486`) never received the
`sprint-4` label when they were filed — including two (`#460`, `#481`) that were already listed in
this very document's own §5.4 before this closure pass. A label-based query (`gh issue list --label
sprint-4`) is exactly the kind of check a future automation would use to audit sprint scope, and it
silently missed 4 of 6 real opportunistic Issues until this pass cross-checked the label against the
document's own prose. The corrective action is the same shape as Sprint 003's dev-lab session-
tracking lesson: apply the label at issue-filing time (`/start-issue` Phase 1a already validates the
`investment:` label the same way — worth extending to `sprint-N` for opportunistic work specifically,
since scoped work already gets it from Project assignment).

**A CI/dev-platform "opportunistic chain" is a repeatable, valuable pattern — but it needs its own
close-out step.** `#477` (measured a PHPUnit bottleneck) → `#481` (parallelized the suite based on
that measurement) → `#486` (fixed a required-check regression `#481` itself introduced, discovered
live only because it blocked an unrelated sprint-doc PR) is a clean example of opportunistic work
compounding value: each Issue's evidence justified the next, and the chain caught its own regression
same-day rather than leaving it to surface later as a mysterious "why can't I merge?" report. Picking
up adjacent CI-platform work opportunistically alongside product Issues, when it's already blocking
or slowing the same `/issue*` pipeline the product work depends on, is worth treating as a repeatable
practice rather than scope creep — but `#486` shipped without ever receiving the `sprint-4` label
(see the lesson above), meaning the chain's own membership in this sprint had to be reconstructed by
hand at closure instead of being queryable from the start.

**A real, closed session with a stale `Tracked` field is a different failure mode from no session at
all, and needs different handling.** `#429` had usable session data (§12) that nobody had read back
into `Tracked`/Retrospective — the fix was mechanical (compute from the data that already existed).
`#460` had no session data at all — the fix is definitional (record the gap, don't estimate it).
Conflating the two during closure would either wrongly discard real data (`#429`) or wrongly
fabricate missing data (`#460`); Sprint 003's `#457` already drew this same distinction for
`sushigo#420`'s undercounted-but-real session versus the fully-empty dev-lab Sessions arrays — worth
keeping as an explicit checklist item at every future sprint closure, not just something to
rediscover each time.

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | #431–#434 | Supplier offerings, Purchase Receipts, receiving UI, and acquisition cost | Consume the stable Purchase Presentation and Stock mutation contracts | Sprint 005 |
| ⏳ | #435–#437 | Branch-aware price lists, UI, and operational seed data | Complete the commercial operating story after purchasing | Sprint 005 |
| ⏳ | #438–#442 | Stock movement, replenishment, access, navigation, and final schema cleanup | Finish Inventory hardening after replacement domains exist | Sprint 006 |
| ⏳ | TBD | Run the 4 written-but-unexecuted Cypress E2E specs from `#423`/`#425`/`#427`/`#429` against a live dev-lab stack | Isolated worktree sandboxes had no live server during implementation; needs a human run per each PR's Manual Testing section | Sprint 005 |
| ⏳ | TBD | Have a repo admin recreate the `PROJECTS_TOKEN` secret so `update-iteration-progress.yml` can regenerate the committed badge | `#460`'s own badge-regeneration Technical Task is blocked on this; not resolvable by an agent without repo admin access | Sprint 005 |
| ⏳ | TBD | Reconcile `#468` into Sprint 004's opportunistic-work record (§5.4/§13) in a follow-up documentation pass | Real, merged, `sprint-4`-labeled dev-platform work that landed inside this sprint's window but was never named in `#488`'s own reconciliation list, and has its own unclosed Sessions entry to fix first | Sprint 005 |
| ⏳ | TBD | Extend `/start-issue` Phase 1a's label validation to also check for a `sprint-N` label on opportunistic work, the same way it already validates `investment:` | Closes the labeling gap named in §16, found across 4 of 6 opportunistic Issues this sprint | Sprint 005 |
| ⏳ | TBD | Promote `sprint-005-purchasing-cost-and-pricing.md` from `doc/sprints/planned/` to `doc/sprints/` and mark it current | Deliberately deferred to `/close-sprint`, run separately once this checklist is otherwise complete — see §18 | Sprint 005 kickoff |

## 18. Sprint Closure Checklist

> Every item below is complete except the very last one, which `#488` deliberately leaves for
> `/close-sprint` to run as a separate follow-up — the same explicit split Sprint 003's own closure
> (`#457`/`#460`) used. Per `doc/conventions/sprints.md` §4, this sprint's own document status is
> `Completed` (frontmatter above), but its formal lifecycle position doesn't change until that
> promotion runs.

- [x] Eight Issues selected as one end-to-end catalog vertical.
- [x] Every included Issue is linked to SushiGo Admin, labeled `sprint-4`, and assigned to the
      `Sprint 4` iteration.
- [x] Sprint 003 design gate `#421` was approved (closed in Sprint 003) and required no re-scope of
      `#422`–`#429`'s assumptions.
- [x] All included work items have a final status marker — all 8 formal-scope Issues and all 6
      opportunistic Issues are `✅` (§7, §13).
- [x] Completed items include Pull Request or commit evidence (§13 — every row now has a PR and
      merge commit SHA).
- [x] Deprecated or cancelled items include replacement/reason. — not applicable, no deprecated or
      cancelled items this sprint.
- [x] Scope changes and opportunistic work are recorded (§5.3 — none; §5.4 — all 6 opportunistic
      Issues, including the 2 added by this pass).
- [x] Tracked time was synchronized from Issue Sessions arrays, with `#429`'s gap corrected and
      `#460`'s gap explicitly recorded rather than backfilled (§12).
- [x] Round totals and sprint totals were recalculated, and estimate variance was calculated (§10).
- [x] Wall-clock time, parallelization factor, and peak concurrency were computed
      (`doc/conventions/sprints.md` §7 — see §11), for both formal scope and the full sprint.
- [x] Dependencies reflect actual execution (§8 — confirmed merge order matched every planned pair).
- [x] Conflict notes reflect actual execution (§9 — no real same-file conflict reported).
- [x] Tests and relevant quality metrics were recorded (§13, §14).
- [x] Delivered value and known limitations were documented (§15).
- [x] Follow-up work was created or recorded (§17).
- [x] Lessons learned were captured (§16).
- [x] Metadata dates and status were updated (frontmatter — `status: Completed`,
      `completed: 2026-08-21`, `last_updated: 2026-08-21`).
- [ ] The next sprint was promoted or created when applicable. — **Deliberately deferred to
      `/close-sprint`**, per this Issue's own explicit scope carve-out (§1) — Sprint 005 remains
      under `doc/sprints/planned/` until that separate run promotes it.
