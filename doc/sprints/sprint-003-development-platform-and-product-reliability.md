---
sprint: "003"
title: Development Platform & Product Reliability
status: In Progress

created: 2026-08-12
started: 2026-08-12
completed:
last_updated: 2026-08-17

base_branch: main
base_commit: cfd6cfb
scope_issues: 10

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-002-platillos-catalog-platform-hardening.md
next: sprint-004-product-catalog-reconstruction.md
---

# Sprint 003 — Development Platform & Product Reliability

> Strengthen the lightweight multi-workspace development platform, then use that more reliable
> foundation to deliver the highest-value SushiGo product and engineering work selected during the
> remainder of Sprint 003 planning.

## 1. Executive Summary

Sprint 003's confirmed scope is **100% delivered**. All ten confirmed planned Issues shipped — five
from `pakodiazdev/sushigo-dev-lab` and five from `pakodiazdev/sushigo` — plus one dev-lab scope
addition (`dev-lab#72`) and one completed opportunistic Issue (`#443`). A second opportunistic
Issue, `#448`, merged its code (PR #451) but its own archived record still has every acceptance
criterion open by design, pending a live validation run — see §13. Per `doc/conventions/sprints.md`
§4, a sprint is only *formally* completed once its closure checklist is done **and** the next sprint
is promoted to current — Sprint 004 is still under `doc/sprints/planned/`, so this document's
`status` remains `In Progress` even though the confirmed scope is finished. This closure pass is
itself tracked under `#457`, still open at the time of writing (PR #458). The dev-lab increment
added
automated Bats coverage for the shared workspace-bootstrap helpers with a required macOS CI gate, a
reliable `make status` workspace-runtime command, an opt-in pgAdmin database browser, a normalized
troubleshooting guide, and ADRs for the architectural decisions that now underpin the lab.

The SushiGo increment delivered employee avatars end to end (administrator-managed and
self-service), replaced unconditional Inventory policy authorization with real permission checks,
prevented concurrent stock overselling with an atomic mutation service and DB-level invariants, and
produced the reviewed architecture and migration plan for the next Product-catalog vertical.

The ten confirmed Issues were estimated at **27h optimistic / 53h pessimistic**. Real tracked time
could be reconciled for the five confirmed `sushigo` Issues (**35h15m** — +19h15m over their 16h
optimistic total, +4h15m over their 31h pessimistic total; see §10/§11 for why). The five confirmed
`dev-lab` Issues, plus the added `dev-lab#72`, all closed with an **empty `Sessions[]` array** — no `/start-issue`
session was ever opened for dev-lab work this sprint — so their real effort is a recorded data gap,
not a zero. `#457` also resynced eight Issues found with a missing `Tracked`/Retrospective before
this document was rewritten.

## 2. Context

Sprint 002 delivered its full planned scope, including the Platillos catalog and platform-hardening
work. Its execution also reinforced how much the project depends on `sushigo-dev-lab`: multiple
agents work concurrently in isolated workspaces, run independent databases and E2E stacks, and
depend on the lab's orchestration scripts to preserve throughput without returning to the heavy
nine-container development stack.

The dev-lab had accumulated a small but coherent maintenance backlog. Its central bootstrap library
had no automated coverage; operators could not see all workspace runtime states in one command;
database inspection required `psql` or a manually configured external client; troubleshooting
guidance contained stale manual-deletion instructions; and several accepted architectural decisions
existed only in Issues, Pull Requests, and commit history.

These tasks belonged together because they improved the reliability, observability, inspectability,
and maintainability of the development platform while shipping a complete employee-identity slice
and reducing two concrete Inventory integrity risks. The Product Inventory design then turned the
newly analyzed backlog into an implementation-ready vertical for a later sprint.

Planning was based on `pakodiazdev/sushigo` `main` at `cfd6cfb`. Sprint 003 existed in the SushiGo
Admin project as a 14-day iteration scheduled for **2026-08-23 through 2026-09-05**. The sprint was
promoted to `doc/sprints/` and officially started on **2026-08-12** by `#443`, formally closing
Sprint 002 — 11 days before its scheduled 2026-08-23 Project iteration window even opened, and
confirmed scope was delivered by 2026-08-17, still 6 days before that window. The Project
iteration window remains the planning cadence; the repository metadata records the actual lifecycle
(started 2026-08-12, confirmed scope delivered 2026-08-17, formal closure pending Sprint 004
promotion — see §4).

While reconciling each Issue's own time-tracking data for this closure pass, a real process gap
surfaced: every confirmed `dev-lab` Issue (plus the added `dev-lab#72`) closed with its
`## 📅 Sessions` array still empty, while every `sushigo` Issue in the same sprint had real session
data. Per `doc/conventions/sprints.md` §7, that missing time is recorded as a gap rather than
estimated from PR or commit timestamps — see §12 and §16.

## 3. Sprint Goal

**Sprint Goal:** Improve development-platform reliability and operational visibility, deliver
employee identity end to end, close Inventory authorization/concurrency risks, and finalize the
Product Inventory target design with conflict-aware execution and complete time/evidence tracking.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-08-12 |
| Planned iteration start | 2026-08-23 |
| Planned iteration end | 2026-09-05 |
| Started | 2026-08-12 |
| Completed | — (confirmed scope delivered 2026-08-17; formal closure pending Sprint 004 promotion, see §18) |
| Calendar span so far | 6 days (2026-08-12 → 2026-08-17) |
| Active workdays with session evidence | 4 (2026-08-12 → 2026-08-15, from real `Sessions[]` data — see §11's wall-clock blocks). dev-lab Issue/PR activity additionally lands on 2026-08-13 and 2026-08-17, but with no session data at all (see §12) |

## 5. Scope

### 5.1 Included

Confirmed `pakodiazdev/sushigo-dev-lab` scope:

- Automated Bats coverage and macOS CI for the workspace-bootstrap configuration helpers
  (`sushigo-dev-lab#64`).
- A reliable `make status` runtime overview for every configured workspace
  (`sushigo-dev-lab#67`).
- An opt-in, host-only pgAdmin service with a preconfigured shared-PostgreSQL connection
  (`sushigo-dev-lab#68`).
- Normalized and corrected troubleshooting guidance, including replacement of stale destructive
  manual workflows (`sushigo-dev-lab#66`).
- Backfilled ADRs for shared bootstrap, workspace deletion, per-slot E2E infrastructure, and the
  final pgAdmin architecture (`sushigo-dev-lab#65`).

Confirmed `pakodiazdev/sushigo` scope:

- Administrator-managed employee avatars on `User`, integrated with the employee administration
  flow, reusable initials fallback, and initial identity-surface adoption (`sushigo#401`).
- Self-service avatar editing and completion of the remaining identity-surface rollout
  (`sushigo#420`).
- Permission-backed authorization for the Item, ItemVariant, and InventoryLocation policies,
  replacing unconditional policy stubs while preserving the separate media permission
  (`sushigo#400`).
- A reviewed Product Inventory target architecture, UI/API contract, and incremental migration plan
  that gates later catalog implementation (`sushigo#421`).
- Concurrency-safe stock mutation and database/application balance invariants that prevent two
  requests from consuming the same available units (`sushigo#430`).

### 5.2 Excluded

- Any `pakodiazdev/sushigo` Issue not explicitly listed in the confirmed scope.
- Product catalog implementation (`sushigo#422`–`sushigo#429`); it must follow the reviewed design
  from `sushigo#421` rather than run concurrently with the design gate.
- Purchase, pricing, and remaining Stock-hardening roadmap (`sushigo#431`–`sushigo#442`).
- Automatic assignment of every open SushiGo Issue merely because it exists in the backlog.
- Unplanned portability work to make the macOS-oriented dev-lab support every Linux distribution.
- Broad refactors of side-effect-heavy bootstrap operations (`install_deps()` and
  `bootstrap_laravel()`) solely to make them unit-testable under `sushigo-dev-lab#64`.
- Rewriting the Project iteration cadence merely because the repository lifecycle started before
  its scheduled iteration window.

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| 2026-08-13 | ✅ | `dev-lab#72` | Added — require the `Bats (macOS)` CI check to pass before any PR (including this repo's own) can merge to `main` | Opportunistic follow-up noticed while landing `dev-lab#64`: the new Bats CI job was informational only, so a red run didn't actually block a merge. Scheduled alongside `#64` under the `sprint-3` label as an 11th confirmed Issue rather than folded silently into `#64`'s own scope. |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-08-12 | #443 | Formally close Sprint 002, promote Sprint 003, and record Sprint 004 planning | Sprint lifecycle transition and planning documents were ready for permanent review | Sprint 002 closed; Sprint 003 promoted; Sprint 004 and roadmap alias convention submitted together; PR #444; 16m tracked |
| 2026-08-13 | #448 | Move `/issue` automated-review loops to isolated subagents | Review-loop context growth and `finish-pr` approval interruptions required an unplanned reliability pass | Copilot/Devin loops isolated, CI/session safeguards hardened, and file-list captures stabilized; PR #451; 9h20m tracked; **validation still pending** — all 5 Acceptance Criteria and one Technical Task remain open by design until a real `/issue` run exercises them (§13, §17) |
| 2026-08-17 | #457 | Close out Sprint 003 documentation — resync progress and record data-quality gaps | Sprint 003's confirmed scope was 100% closed on GitHub, but this document and 8 of its 13 Issues' own Sessions/Tracked/Retrospective data had never been resynced after the last 6 Issues closed | 8 Issues (`dev-lab#64`, `#65`, `#66`, `#67`, `#68`, `#72`, `sushigo#420`, `#443`) resynced directly on GitHub with real or explicitly gap-marked time data; this document rewritten to reflect actual status, evidence, wall-clock time, and the dev-lab Sessions-tracking gap as a named lesson — tracked via PR #458, still open (see §13) |

## 6. Value Ranking

The ranking below covers the final planned scope. Post-start additions require an explicit scope
change and recalculation rather than automatic backlog intake.

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | `sushigo#430` | Prevent a demonstrated concurrency window from overselling Stock and violating balance integrity |
| **High** | `sushigo#400`, `sushigo#401`, `sushigo#420`, `dev-lab#64`, `dev-lab#68` | Close a latent authorization gap, deliver complete employee identity value, prevent regressions in shared bootstrap, and remove database-inspection friction |
| **Medium** | `sushigo#421`, `dev-lab#67`, `dev-lab#66` | Gate the next Product vertical with reviewed design, improve runtime observability, and replace stale operational guidance |
| **Low** | `dev-lab#65`, `dev-lab#72` | Preserve architectural rationale after the behavior has shipped; enforce a CI gate that already existed informationally |
| **Deferred** | — | No confirmed dev-lab Issue is intentionally deferred |

### Ordering principle

> **Value first, parallelism second.** Product security, correctness, and data integrity take
> precedence. Within the dev-lab lane, testing and observability land before documentation of the
> final state; Product implementation remains behind its approved design gate.

## 7. Route A — Execution Rounds

These rounds scheduled the complete planned dev-lab and SushiGo scope. `dev-lab#72` (§5.3) had no
meaningful file-conflict surface to schedule into a round and is tracked only in the Value Ranking,
Execution Evidence, and Quality Results sections.

### Round 1 — Establish Safety and Runtime Visibility

| Status | Issue | Repository | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---|---:|---:|---:|---|---|
| ✅ | #64 | `sushigo-dev-lab` | Add Bats coverage and macOS CI for workspace-bootstrap configuration helpers | High | 3h | 6h | not tracked (gap) | PR dev-lab#71 | Merged 2026-08-12; `Sessions[]` never logged |
| ✅ | #67 | `sushigo-dev-lab` | Add `make status` for a reliable workspace runtime overview | Medium | 2h | 4h | not tracked (gap) | PR dev-lab#74 | Merged 2026-08-17; `Sessions[]` never logged |
| ✅ | #401 | `sushigo` | Add administrator-managed employee avatars with reusable initials fallback | High | 4h | 7h | 20h25m | PR #449 | Core implementation landed within estimate in session 1; sessions 2-3 were review-response, not new scope |
| ✅ | #400 | `sushigo` | Enforce permissions in Item, ItemVariant, and InventoryLocation policies | High | 2h | 4h | 3h10m | PR #445 | Merged to `main` (`14ee15f`) |
| ✅ | #430 | `sushigo` | Prevent concurrent stock overselling and enforce balance invariants | Critical | 4h | 8h | 6h55m | PR #447 | Row locks + DB CHECK constraints + reusable `StockMutationService`; balances repaired/validated after a third review pass |
| ✅ | #421 | `sushigo` | Design the Product Inventory target architecture and migration plan | Medium | 3h | 6h | 3h45m | PR #446 | Domain model, ERD, SlidePanel flow, API outline, TD-03; merged to `main` (`1ff8586`) |
|  |  |  | **Round total** |  | **18h** | **35h** | **34h15m*** |  | *2 of 6 Issues (`#64`, `#67`) untracked — see §12 |

### Round 2 — Add On-Demand Database Inspection

| Status | Issue | Repository | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---|---:|---:|---:|---|---|
| ✅ | #68 | `sushigo-dev-lab` | Add opt-in pgAdmin service for the shared PostgreSQL instance | High | 2h | 4h | not tracked (gap) | PR dev-lab#75 | Merged 2026-08-17, after `#67` as planned; `Sessions[]` never logged |
| ✅ | #420 | `sushigo` | Add self-service avatar editing and complete identity-surface rollout | High | 3h | 6h | 1h00m (logged; undercounts real effort — see §12) | PR #456 | Merged 2026-08-16, after `#401` as planned |
|  |  |  | **Round total** |  | **5h** | **10h** | **1h00m*** |  | *1 of 2 Issues (`#68`) untracked — see §12 |

### Round 3 — Correct Guidance and Preserve Decisions

| Status | Issue | Repository | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---|---:|---:|---:|---|---|
| ✅ | #66 | `sushigo-dev-lab` | Normalize and correct troubleshooting guidance | Medium | 2h | 4h | not tracked (gap) | PR dev-lab#73 | Merged 2026-08-17; `Sessions[]` never logged |
| ✅ | #65 | `sushigo-dev-lab` | Backfill ADRs for #010, #011, #016, and #68 | Low | 2h | 4h | not tracked (gap) | PR dev-lab#77 | Merged 2026-08-17, after `#68` as planned; `Sessions[]` never logged |
|  |  |  | **Round total** |  | **4h** | **8h** | **not tracked (gap)** |  | *2 of 2 Issues untracked — see §12 |

## 8. Route B — Sequential Dependencies

```text
dev-lab#67 (Round 1) → dev-lab#68 (Round 2)
Type: file-level sequencing.
Reason: both modify Makefile targets/help and README operational documentation. Landing #67 first
lets #68 build on the final command surface instead of resolving avoidable conflicts.
Confirmed: PR dev-lab#74 merged 2026-08-17 12:39:59 -06:00, PR dev-lab#75 merged
2026-08-17 13:33:28 -06:00 (local repository time, matching commit-timestamp convention).

dev-lab#68 (Round 2) → dev-lab#65 (Round 3)
Type: architectural-evidence dependency.
Reason: ADR-005 must capture the implementation that actually shipped — optional Compose profile,
loopback-only exposure, login trade-off, and runtime credential bootstrap — rather than a proposal.
Confirmed: PR dev-lab#75 merged 2026-08-17 13:33:28 -06:00, PR dev-lab#77 merged
2026-08-17 19:55:09 -06:00.

sushigo#401 (Round 1) → sushigo#420 (Round 2)
Type: product and shared-component dependency.
Reason: #401 establishes the backend avatar contract, reusable fallback component, and first
identity surfaces that #420 extends into self-service editing and the remaining application views.
Confirmed: PR #449 merged 2026-08-15 14:06:27 -06:00, PR #456 merged 2026-08-16 21:23:50 -06:00.
```

All times above are converted from GitHub's UTC `mergedAt` to the repository's local `-06:00`,
matching the offset already used by `git log` commit timestamps in this project.

All three planned dependency pairs were respected in actual merge order. No unplanned same-file
conflict was reported during execution.

`dev-lab#64` was technically independent of the other confirmed Issues once its test documentation
lived under `tests/README.md`. `dev-lab#66` ran independently at the code level, placed in the final
documentation round so its operational guidance reflects the final sprint command surface.

`sushigo#401` and `sushigo#420` had no dependency on the confirmed dev-lab work. Their product lane
depended on the already merged generic media system from `sushigo#377` and was sequenced internally
to keep the API and reusable frontend component contract stable.

`sushigo#400` was independent of the avatar and dev-lab lanes. Its authorization contract was
already defined by the route middleware and Form Requests; implementation preserved the dedicated
`items.manage-media` boundary introduced by `sushigo#377`.

`sushigo#430` was independent of the avatar, policy, and dev-lab implementations. It landed in
Round 1 because the later purchase-receiving backend (`sushigo#432`, outside this sprint) must reuse
its atomic Stock mutation contract rather than create another unsafe path.

`sushigo#421` was intentionally design-only. It audited the same Inventory areas as #400/#430 but
did not edit production code; Product catalog implementation (`sushigo#422` onward) remains excluded
until #421's design is consumed by a later sprint.

`dev-lab#72` had no dependency beyond needing `dev-lab#64`'s CI workflow to exist first, which it
did (`#64` merged 2026-08-12 local, `#72` merged 2026-08-17 local — PR dev-lab#76,
2026-08-17 19:04:57 -06:00).

## 9. Conflict Risk Map

| Shared file | Issues touching it | Planned rounds | Risk / Coordination |
|---|---|---|---|
| `sushigo-dev-lab/Makefile` | `dev-lab#67`, `dev-lab#68` | 1, 2 | Sequential; both add lifecycle targets and help text |
| `sushigo-dev-lab/README.md` | `dev-lab#67`, `dev-lab#68` | 1, 2 | Sequential; #67 updates workflow/status, #68 updates shared services |
| `sushigo-dev-lab/docker-compose.yml` | `dev-lab#68` | 2 | Isolated in confirmed scope |
| `sushigo-dev-lab/scripts/lib/workspace-bootstrap.sh` | `dev-lab#64` | 1 | Tests should avoid behavioral refactoring unless a real defect is exposed |
| `sushigo-dev-lab/docs/troubleshooting.md` | `dev-lab#66` | 3 | Isolated documentation ownership |
| `sushigo-dev-lab/docs/decisions/index.md` | `dev-lab#65` | 3 | Single ADR/index owner |
| `sushigo/code/api/app/Models/User.php`, employee API, and self-profile API | `sushigo#401`, `sushigo#420` | 1, 2 | Sequential; #401 establishes admin-managed media and #420 adds self-service mutation |
| Shared avatar component, auth store, employee views, and layout header | `sushigo#401`, `sushigo#420` | 1, 2 | Sequential ownership; #420 reuses and expands the component introduced by #401 |
| Inventory policy classes and their unit tests | `sushigo#400` | 1 | Isolated ownership; regression-test route permissions and media authorization |
| `Stock.php`, Stock mutation services/schema, and Inventory stock tests | `sushigo#430` | 1 | Single implementation owner; coordinate test fixtures with #400 but no expected production-file collision |
| Inventory architecture/API/UI audit surface | `sushigo#421` | 1 | Read-only design work; may cite #400/#430 evidence but must not implement their changes |
| `sushigo-dev-lab` branch protection settings | `dev-lab#72` | — | Repository setting, not a file; isolated from every other Issue's diff |

### Conflict methodology

Affected files were inferred from each Issue's requested deliverables and confirmed against the
current repository structure on 2026-08-12. The map intentionally treats shared documentation and
Makefile command surfaces as conflict nodes even when the underlying services are independent.

At closure, actual merge order matched every planned sequential pair (see §8's confirmations), and
no additional file-level conflict was reported in any PR's review thread. The map covers the final
planned scope. #421 must produce a deeper conflict/dependency map for the future Product roadmap
without pulling that implementation into Sprint 3.

## 10. Estimate Tracking by Round

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| Round 1 | 6 | 18h | 35h | 34h15m* | N/A — incomplete | N/A — incomplete |
| Round 2 | 2 | 5h | 10h | 1h00m* | N/A — incomplete | N/A — incomplete |
| Round 3 | 2 | 4h | 8h | not tracked (gap) | N/A — incomplete | N/A — incomplete |
| **Confirmed dev-lab total** | **5** | **11h** | **22h** | **not tracked (gap)** | **N/A — full gap** | **N/A — full gap** |
| Confirmed SushiGo scope | 5 | 16h | 31h | 35h15m | **+19h15m** | **+4h15m** |
| **Confirmed sprint total** | **10** | **27h** | **53h** | **35h15m*** | **N/A — incomplete** | **N/A — incomplete** |

*Every total marked with `*` includes at least one Issue with `Tracked: not tracked (gap)`.
Comparing a partial tracked sum against a full estimate total would misstate variance, so those
cells read `N/A — incomplete` rather than a computed number. The only row where all Issues have
real tracked time — **Confirmed SushiGo scope** — has a real, computed variance: **+19h15m** over
its 16h optimistic total and **+4h15m** over its 31h pessimistic total.

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Testing and CI (`dev-lab#64`) | 3h–6h | not tracked (gap) | — |
| Operational tooling (`dev-lab#67`, `dev-lab#68`) | 4h–8h | not tracked (gap) | — |
| Documentation and ADRs (`dev-lab#66`, `dev-lab#65`) | 4h–8h | not tracked (gap) | — |
| Employee identity (`sushigo#401`, `sushigo#420`) | 7h–13h | 21h25m | +14h25m vs opt / +8h25m vs pess |
| Inventory authorization and Stock integrity (`sushigo#400`, `sushigo#430`) | 6h–12h | 10h05m | +4h05m vs opt / −1h55m vs pess |
| Product Inventory design (`sushigo#421`) | 3h–6h | 3h45m | +45m vs opt / −2h15m vs pess |
| Code review and validation | Included in Issue estimates | Included in Issue-level Tracked above | — |
| Rework and corrections | Included in Issue estimates | Included in Issue-level Tracked above | — |
| **Confirmed dev-lab total** | **11h–22h** | **not tracked (gap)** | **—** |
| **Confirmed sprint total** | **27h–53h** | **35h15m\*** | **\*incomplete — 5 of 10 confirmed Issues untracked** |

### Wall-Clock Time & Parallelism

Computed at sprint closure directly from every Issue's `## 📅 Sessions` array, following
`doc/conventions/sprints.md` §7. Covers the full sprint including opportunistic work with usable
session data (`#443`, `#448`) — the six `dev-lab` Issues (`#64`, `#65`, `#66`, `#67`, `#68`, `#72`)
contribute nothing, per §7's rule for Issues with no session data (see §12).

- **Person-hours:** 44h51m (sum of every logged session across `#400`, `#401`, `#420`, `#421`,
  `#430`, `#443`, `#448` — no merging)
- **Wall-clock time:** 28h27m (union of the same sessions, overlapping/back-to-back intervals
  merged)
- **Parallelization factor:** 1.58× (Person-hours ÷ Wall-clock time)
- **Peak concurrency:** 4 simultaneous sessions (2026-08-12 20:23 — Issues #400, #401, #421, #430)

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| 2026-08-12 18:08 → 18:14 | 6m | #443 |
| 2026-08-12 18:18 → 18:28 | 10m | #443 |
| 2026-08-12 20:13 → 2026-08-13 07:20 | 11h07m | #400, #401, #421, #430 |
| 2026-08-13 07:48 → 20:48 | 13h00m | #448, #401, #430 |
| 2026-08-13 20:55 → 23:01 | 2h06m | #430 |
| 2026-08-14 12:40 → 13:38 | 58m | #401 |
| 2026-08-15 17:53 → 18:53 | 1h00m | #420 |

## 12. Notes on Estimate Confidence

The dev-lab estimates were produced after reading the current Issue bodies and auditing the current
repository files on 2026-08-12. Planning confidence was **medium**:

- `dev-lab#64` was wider than its original body suggested because no CI workflow existed and the
  tested scripts deliberately use macOS-specific `sed -i ''`; the estimate assumed a macOS runner
  instead of an unplanned portability refactor.
- `dev-lab#67` needed to validate process liveness instead of treating socket existence as
  sufficient, and needed to define degraded/stale states.
- `dev-lab#68` had the most complete technical scope and acceptance criteria; its main uncertainty
  was runtime-safe pgAdmin credential provisioning and container validation.
- `dev-lab#66` included correctness work because the current document contained stale destructive
  commands; it was not a formatting-only pass.
- `dev-lab#65` included a fourth ADR for #68 and therefore had to wait for implementation evidence.
- `sushigo#401` was reduced from a broad avatar initiative to an administrator-managed first slice;
  its estimate excluded the self-service profile and broad identity-surface rollout split into
  `sushigo#420`.
- `sushigo#420` was estimated independently after the split and assumed #401's API contract and
  reusable avatar component would land first.
- `sushigo#400` covered all three unconditional inventory policies and their tests. Its estimate
  assumed the existing permission vocabulary remained unchanged and explicitly excluded a broader
  authorization redesign.
- `sushigo#430` had high variance because meaningful concurrent-request tests and safe first-row
  creation required database-specific coordination beyond the straightforward row lock.
- `sushigo#421` was capped as design-only. Implementing migrations, APIs, UI, or seeders belongs to
  #422 onward and would be an unplanned scope expansion.

### Data-quality gap discovered at closure

Five of the five confirmed `dev-lab` Issues (`#64`, `#65`, `#66`, `#67`, `#68`) plus the
opportunistic addition `dev-lab#72` closed with an **empty `## 📅 Sessions` array** — no
`/start-issue` work session was ever opened for dev-lab work this sprint, unlike every `sushigo`
Issue in the same sprint. Per `doc/conventions/sprints.md` §7 ("never estimated or eyeballed from
merge timestamps"), that time is recorded here as `not tracked (gap)` rather than approximated from
PR created/merged timestamps. It contributes nothing to §10's Estimate Tracking, §11's Consolidated
Time Tracking, or the Wall-Clock/Parallelization figures — which is why those figures cover only the
`sushigo` lane plus the two opportunistic Issues with real session data (`#443`, `#448`). See §16
for the corrective lesson.

Separately, `sushigo#420` logged one real 1h00m session, but its own Retrospective documents that
this materially undercounts the issue's actual implementation history: the merged PR (#456) spans
27 commits across 2026-08-15 and 2026-08-16 covering a full UX rework, a security fix, and several
review-response cycles, none of which has a corresponding session entry beyond the single logged
2026-08-15 session. That logged 1h00m is included in the totals above as-is — undercounted, not
corrected by backfilling a plausible-looking number.

## 13. Execution Evidence

| Status | Issue | Repository | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---|---:|---|---:|---|
| ✅ | #64 | `sushigo-dev-lab` | Bats fixtures/tests for `sed_esc`, `configure_api_env`, `configure_webapp_env`, `configure_workspace_env` (replacement, missing-key-append, and escaping branches) plus a macOS GitHub Actions workflow and `tests/README.md` | PR dev-lab#71 | — | not tracked (gap) | `install_deps`/`bootstrap_laravel` refactoring stayed out of scope as planned |
| ✅ | #67 | `sushigo-dev-lab` | `scripts/status.sh` + `make status`, distinguishing running/degraded/stopped/stale-socket/unconfigured states via Overmind process liveness instead of socket existence, across all configured workspace slots | PR dev-lab#74 | — | not tracked (gap) | |
| ✅ | #401 | `sushigo` | `User` adopts the polymorphic media system (owner-or-`users.update` gating); avatar attach/replace wired through employee create/update, exposed via `EmployeeResource`/`/auth/me`/login response; reusable `<Avatar>` component wired into employee list, detail header, and app header; added a per-adopter upload-context system restricting avatar uploads to images while Item/Dish keep video | PR #449 | — | 20h25m | 25+ PHPUnit tests + Vitest coverage + 1 Cypress happy path passing; Pint/ESLint/TypeScript clean; SonarCloud quality gate passing (0 new smells after cleanup); Copilot review clean; three review-response rounds across Devin/DeepWiki, a separate code-review agent, and SonarCloud fixed 9+ real defects total (attach-transaction atomicity, missing login `avatar_url`, roles discarded on create, uploader visible to unauthorized/user-less-employee editors, wrong photo on multi-asset create, soft-deleted-gallery and fail-open context validation gaps, a `config()` dot-path 500, a stale-uploader cross-employee leak, cognitive-complexity/lint smells) |
| ✅ | #400 | `sushigo` | Replaced unconditional `return true` stubs in `ItemPolicy`/`ItemVariantPolicy`/`InventoryLocationPolicy` with real Spatie permission checks; 72 new unit assertions | PR #445 | `14ee15f` | 3h10m | 72 policy unit tests + 44 regression tests passing; Pint clean; SonarCloud quality gate passing (100% new coverage); Copilot review clean; Devin/DeepWiki 0 bugs, 2 flags fixed (stale comment, nullable-param footgun), 4 evaluated as false positive/informational |
| ✅ | #430 | `sushigo` | DB CHECK constraints, row-locked stock-out, race-safe `StockMutationService` for first-receipt creation, and application-layer balance guards | PR #447 | — | 6h55m | 45 new/updated tests, full 1322-test Feature suite regression-clean, Pint clean; Copilot + Devin review findings addressed; a third review pass found the `NOT VALID` constraints were never repaired/validated against pre-existing rows, fixed with a clamping `UPDATE` + `VALIDATE CONSTRAINT` |
| ✅ | #421 | `sushigo` | Finalized the Product → Variant → Purchase Presentation domain model, ERD, SlidePanel UX flow, API contract outline, and additive-first migration sequencing for #422-#442; recorded TD-03 | PR #446 | `1ff8586` | 3h45m | Design/ERD/UI/API/migration gate only, no production implementation; 4 Copilot threads + 5 Devin review cycles resolved, all real findings |
| ✅ | #68 | `sushigo-dev-lab` | Opt-in `pgadmin` Compose service under the `tools` profile, loopback-only on `127.0.0.1:5050`, with the shared PostgreSQL connection generated at runtime from `POSTGRES_USER`/`POSTGRES_PASSWORD` (no committed credentials), plus `make pgadmin`/`make pgadmin-stop` and README/`.env.example` documentation | PR dev-lab#75 | — | not tracked (gap) | |
| ✅ | #420 | `sushigo` | Self-service avatar upload/replace via a new profile UI; auth store refreshed immediately after changes; shared `<Avatar>` component adopted across identified identity surfaces; PHPUnit/Vitest/Cypress coverage | PR #456 | — | 1h00m (logged; undercounts real effort — see §12) | 27-commit merge history across 2026-08-15/16 spanning a crop-picker UX rework, a security fix (preventing a `users.update` holder from claiming another user's avatar), and SonarCloud fixes, against 1 logged session |
| ✅ | #66 | `sushigo-dev-lab` | Normalized every troubleshooting entry to the symptom/Cause/Fix structure; replaced stale destructive manual-deletion and package-lock guidance with the current supported workflow | PR dev-lab#73 | — | not tracked (gap) | |
| ✅ | #65 | `sushigo-dev-lab` | Added ADR-002 through ADR-005 covering shared workspace-bootstrap (#10), safe workspace deletion (#11), per-slot E2E infrastructure (#16), and the pgAdmin architecture that shipped in #68; updated `docs/decisions/index.md` | PR dev-lab#77 | — | not tracked (gap) | |
| ✅ | #72 | `sushigo-dev-lab` | Branch protection rule on `main` requiring the `Bats (macOS)` check and an up-to-date branch before merge | PR dev-lab#76 | — | not tracked (gap) | Scope addition, not part of the original 10-Issue confirmed scope — see §5.3 |
| ✅ | #443 | `sushigo` | Sprint 002 marked Completed; Sprint 003 promoted and marked In Progress; Sprint 004 kept planned; Sprints 005–006 documented; DES/CAT/OPS/STK roadmap alias convention published | PR #444 | — | 16m | Opportunistic; tracked time covers only the final review/publish pass — see its own Retrospective |
| 🚧 | #448 | `sushigo` | Isolated Copilot and Devin review loops into foreground workers and hardened unattended close-out safeguards | PR #451 | — | 9h20m | Docs/command-file change, no test suite: `git diff --check`, frontmatter/allow-list, and compact-contract/safe-capture structural assertions all passing; 6 Copilot review threads resolved (SHA-anchored re-checks, idempotent session cleanup, squash-verification stabilization, allow-list completion, canonical-body dispute sourcing). **Not `✅`:** `doc/tasks/2026-08/448-isolate-review-loops-in-subagents.md` still has all 5 Acceptance Criteria unchecked and one Technical Task left undone — its own Retrospective says they "remain open by design" pending a real `/issue` run to validate against, and were never subsequently closed out |
| 🚧 | #457 | `sushigo` | Resynced 8 Issues' Sessions/Tracked/Retrospective data (`dev-lab#64`, `#65`, `#66`, `#67`, `#68`, `#72`, `sushigo#420`, `#443`) and rewrote this sprint document | PR #458 | — | not tracked (this closure pass has no `/start-issue` session of its own — see §12) | Open, pending merge at the time of writing; this row (and this document's `status`) update once `#457` closes |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Dev-lab automated tests | No Bats suite or CI workflow | Bats suite and green macOS CI | Bats suite covering `sed_esc`/`configure_*` helpers, running in `bats-macos.yml`, required as a branch-protection check (`#72`) | ✅ |
| Workspace runtime visibility | Per-workspace manual checks | One reliable status command | `make status` distinguishing running/degraded/stopped/stale-socket/unconfigured via Overmind process liveness | ✅ |
| Database inspection | `psql` or external manual configuration | Host-only, preconfigured pgAdmin on demand | `make pgadmin` — loopback-only, runtime-generated shared PostgreSQL connection, no committed credentials | ✅ |
| Troubleshooting consistency | Mixed formats and stale commands | Every entry has symptom/Cause/Fix and current safe guidance | Normalized; stale destructive manual-deletion and package-lock guidance replaced | ✅ |
| Recorded dev-lab ADRs | 1 | 5 | 5 (existing ADR-001 plus new ADR-002 through ADR-005) | ✅ |
| Employee identity | Text-only identity references across the app | End-to-end avatar identity, administrator-managed and self-service | `#401` (admin-managed foundation) + `#420` (self-service editing and rollout) shipped, PHPUnit/Vitest/Cypress covered | ✅ |
| Inventory authorization stubs | 3 policies authorize unconditionally | Exact permission-backed policies with negative/positive tests | Real Spatie permission checks in `ItemPolicy`/`ItemVariantPolicy`/`InventoryLocationPolicy`; 72 new unit assertions, 44 regression tests | ✅ |
| Concurrent Stock mutation | Read-then-decrement window can approve the same available units twice | Atomic mutation plus enforced balance invariants | `StockMutationService` + DB CHECK constraints, validated/repaired against pre-existing rows; 45 new/updated tests | ✅ |
| Product Inventory target design | Discovery exists only in planning discussion/backlog | Reviewed ERD, UI flow, API outline, migration plan, and dependency map | Delivered: domain model, ERD, SlidePanel UX flow, API contract outline, additive-first migration sequencing, TD-03 | ✅ |
| SushiGo tests and quality gates | TBD | 100% relevant checks passing, 0 new security findings | Every merged PR (#445, #446, #447, #449, #456) reports Pint/ESLint/TypeScript clean and SonarCloud quality gate passing; Copilot/Devin review cycles resolved | ✅ |

## 15. Results

### 15.1 Delivered Value

Delivered a safer, more observable, more inspectable, and better-documented parallel-development
environment: automated regression coverage and an enforced CI gate for the shared bootstrap
library, one reliable workspace-status command, an opt-in database browser, corrected
troubleshooting guidance, and four backfilled ADRs (ADR-002 through ADR-005 — five recorded
dev-lab ADRs total, including the pre-existing ADR-001).

Delivered end-to-end employee identity (administrator-managed and self-service avatars across the
agreed application surfaces), closed a latent Inventory authorization gap across three policies,
and eliminated a demonstrated concurrent-overselling window in Stock with DB-level invariants. Also
delivered an implementation-ready Product Inventory target design (domain model, ERD, UI flow, API
outline, migration plan) gating the next catalog sprint.

### 15.2 Planned vs. Actual

- **Confirmed planned Issues:** 5 dev-lab Issues and 5 SushiGo Issues — **10/10 completed (100%)**.
- **Scope additions:** 1 (`dev-lab#72`) — completed.
- **Opportunistic Issues:** 3 (`#443`, `#448`, `#457`) — 1/3 completed (`#443`). `#448`'s code
  merged (PR #451) but its own Acceptance Criteria remain open by design pending a live validation
  run, so it is not counted as completed (§13, §17). `#457` (this closure pass) is still open,
  tracked via PR #458 (see §13).
- **Confirmed estimate:** 27h optimistic / 53h pessimistic (original 10-Issue scope).
- **Completed:** 12/14 (10 planned + 1 scope addition + 1 of 3 opportunistic); `#448` and `#457`
  remain open.
- **Deprecated or cancelled:** 0.
- **Tracked:** 35h15m across the 5 confirmed `sushigo` Issues; not tracked (gap, not a zero — see
  §12) across the 5 confirmed `dev-lab` Issues and `dev-lab#72`; 9h36m across `#443`+`#448`; `#457`
  (this closure pass) has no `/start-issue` session of its own either, extending the same tracking
  gap to the Issue that documents it.

### 15.3 Known Limitations

- Sprint 003 officially started on 2026-08-12, 11 days before its scheduled 2026-08-23 Project
  Iteration window even opened, and confirmed scope was delivered by 2026-08-17 — still 6 days
  before that window. The Project Iteration remains the planning cadence; this document's dates
  are the actual lifecycle record.
- Product catalog implementation remains outside Sprint 3. `#421`'s design may still change
  `#422` onward before a later sprint selects those implementation Issues.
- Opportunistic Issue `#448` merged its code (PR #451) but is not validated: its own archived
  Retrospective states all 5 Acceptance Criteria and one Technical Task (a live token/wall-clock
  comparison run) remain open by design, pending a real `/issue` execution that never followed up
  — see §17.
- The confirmed dev-lab lane (`#64`, `#65`, `#66`, `#67`, `#68`) plus `#72` has **no tracked time
  at all** — a structural data gap, not a claim that no effort was spent. Every real-time metric
  in §10/§11 necessarily excludes that lane.
- `sushigo#420`'s logged session materially undercounts its real implementation history (see §12).
- The 27h–53h range assumed conflict-aware parallel execution; it was engineering effort, not
  elapsed calendar time. The real Wall-Clock/Parallelization figures in §11 cover only the Issues
  with usable session data.
- Sprint 004 remains under `doc/sprints/planned/` — promoting it to current is intentionally left
  as separate follow-up work (§17), not bundled into this closure pass.

## 16. Lessons Learned

**Dev-lab work needs the same session discipline as product work.** Every confirmed `dev-lab`
Issue in this sprint (`#64`, `#65`, `#66`, `#67`, `#68`) plus the added `#72` closed with an empty
`Sessions[]` array — nobody opened a `/start-issue` session for dev-lab work, while every `sushigo`
Issue in the same sprint had real session data. This means Sprint 3's true engineering effort is
understated in every time metric that touches the dev-lab lane, and the Wall-Clock/Parallelization
figures in §11 necessarily exclude half of the sprint's confirmed scope entirely — 5 of the 10
confirmed Issues (§11). The corrective
action is procedural, not retroactive: dev-lab work must open a session the same way sushigo work
does, or the sprint record keeps having a structural blind spot in exactly the lane meant to make
multi-agent work reliable and observable.

**A single logged session does not guarantee accurate tracked time.** `sushigo#420` technically had
a non-empty `Sessions[]` array, which could look like a solved case at a glance — but its one 1h00m
entry covered only a fraction of a 27-commit, two-day implementation. Sessions must be opened for
every active work block, not just the first one, or `Tracked` silently drifts from reality even when
the array isn't empty. This is the same failure mode `#416` already documented for Sprint 002's
`#360` ("Sessions entry never closed out") — it is worth treating as a recurring class of gap to
watch for at every sprint closure, not a one-off.

**Planning lesson (recorded before execution, confirmed at closure):** development-platform work
must be represented in the same sprint evidence as product work when it consumes real agent
capacity. Omitting dev-lab Issues would have understated person-hours, hidden dependencies that
affect every workspace, and made the parallelization metrics incomplete — which is exactly what
happened to the dev-lab lane's time data specifically, even though the Issues themselves were
correctly included in scope.

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | #422–#429 | Deliver the Product → Variant → Purchase Presentation catalog vertical | Intentionally gated by the reviewed target design from #421 | Sprint 004 |
| ⏳ | #431–#437 | Deliver purchasing, acquisition cost, price lists, and operational seed data | Depends on the Product catalog completed in Sprint 4 | Sprint 005 |
| ⏳ | #438–#442 | Complete Stock integrity, access, navigation, and legacy cleanup | Requires the replacement operational domains before final cleanup | Sprint 006 |
| ⏳ | TBD | Reassess dev-lab portability only if Linux support becomes a product need | Explicitly excluded from #64's macOS-focused CI scope | Future |
| ⏳ | TBD | Require every dev-lab Issue to open a `/start-issue` session before work begins, matching the sushigo convention | Closes the Sessions-tracking gap named in §16, found across 6 dev-lab Issues this sprint | Sprint 004 |
| ⏳ | TBD | Promote `sprint-004-product-catalog-reconstruction.md` from `doc/sprints/planned/` to `doc/sprints/` and mark it current | Sprint 003's confirmed scope is 100% delivered, but per `doc/conventions/sprints.md` §4 it cannot be formally `Completed` until Sprint 004 is promoted; that promotion is a deliberate follow-up decision, not bundled into this closure pass | Sprint 004 kickoff |
| ⏳ | TBD | Run a real `/issue` execution to validate `#448`'s isolated-subagent review loops and close its remaining Acceptance Criteria | `doc/tasks/2026-08/448-isolate-review-loops-in-subagents.md`'s own Retrospective says all 5 ACs and one Technical Task (a live token/wall-clock comparison run) remain open by design pending exactly this — it was never followed up on | Sprint 004 |

## 18. Sprint Closure Checklist

> Per `doc/conventions/sprints.md` §4, this sprint is **not yet formally closed**: `#457` (the row
> below tracking this very checklist pass) is still open, and Sprint 004 has not been promoted from
> `doc/sprints/planned/`. Every item below reflects the state of the *confirmed, planned* scope
> (10 Issues + `dev-lab#72`), which is fully delivered.

- [x] SushiGo application Issues were selected before sprint promotion.
- [x] Every included Issue is linked to SushiGo Admin, labeled `sprint-3`, and assigned to the
      `Sprint 3` iteration.
- [x] All included work items have a final status marker — all ✅ except `#448` (validation
      pending) and `#457` (PR #458 still open), both marked 🚧 (§13).
- [x] Completed items include Pull Request or commit evidence.
- [x] Deprecated items identify their replacement. — not applicable, no deprecated items this sprint.
- [x] Cancelled items include a reason. — not applicable, no cancelled items this sprint.
- [x] Scope changes are recorded (§5.3 — `dev-lab#72`).
- [x] Tracked time was synchronized from Issue sessions, with the dev-lab data gap explicitly
      recorded rather than backfilled (§12).
- [x] Round totals and sprint totals were recalculated (§7, §10).
- [x] Estimate variance was calculated where the underlying data was complete (§10, §11).
- [x] Consolidated effort was completed (§11).
- [x] Wall-clock time, parallelization factor, and peak concurrency were computed
      (`doc/conventions/sprints.md` §7 — see §11).
- [x] Dependencies reflect actual execution (§8).
- [x] Conflict notes reflect actual execution (§9).
- [x] Tests and relevant quality metrics were recorded (§14).
- [x] Delivered value and known limitations were documented (§15).
- [x] Follow-up work was created or recorded (§17).
- [x] Lessons learned were captured (§16).
- [x] Metadata dates and status were updated.
- [ ] The next sprint was promoted or created when applicable. — Sprint 004 remains under
      `doc/sprints/planned/`; promoting it is recorded as separate follow-up work (§17), not
      bundled into this closure pass.
