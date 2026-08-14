---
sprint: "003"
title: Development Platform & Product Reliability
status: In Progress

created: 2026-08-12
started: 2026-08-12
completed:
last_updated: 2026-08-13

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

Sprint 003 is the **current sprint, with scope selection complete and locked**, and contains five planned Issues from
`pakodiazdev/sushigo-dev-lab` and five Issues from `pakodiazdev/sushigo`. The dev-lab increment adds
automated coverage for the shared workspace-bootstrap helpers, a reliable
workspace-status command, an opt-in pgAdmin database browser, corrected troubleshooting guidance,
and ADRs for the architectural decisions that now underpin the lab.

The SushiGo increment delivers employee avatars end to end, replaces unconditional Inventory policy
authorization, prevents concurrent stock overselling, and produces the reviewed architecture and
migration plan for the next Product-catalog vertical. This gives the sprint visible functionality,
configuration/tooling, correctness fixes, and forward product design without implementing Product
contracts before their design gate.

The ten Issues represent an estimated **27h optimistic / 53h pessimistic** of engineering effort.
They are organized into three conflict-aware rounds: establish testing/runtime visibility, employee
identity, Inventory authorization/integrity, and Product design in parallel; add pgAdmin after the
shared Makefile/README surface is clear while completing self-service avatars; then normalize
documentation and record the final dev-lab architectural decisions.

## 2. Context

Sprint 002 delivered its full planned scope, including the Platillos catalog and platform-hardening
work. Its execution also reinforced how much the project depends on `sushigo-dev-lab`: multiple
agents work concurrently in isolated workspaces, run independent databases and E2E stacks, and
depend on the lab's orchestration scripts to preserve throughput without returning to the heavy
nine-container development stack.

The dev-lab has accumulated a small but coherent maintenance backlog. Its central bootstrap library
has no automated coverage; operators cannot see all workspace runtime states in one command;
database inspection still requires `psql` or a manually configured external client; troubleshooting
guidance contains stale manual-deletion instructions; and several accepted architectural decisions
exist only in Issues, Pull Requests, and commit history.

These tasks belong together because they improve the reliability, observability, inspectability,
and maintainability of the development platform while shipping a complete employee-identity slice
and reducing two concrete Inventory integrity risks. The Product Inventory design then turns the
newly analyzed backlog into an implementation-ready vertical for a later sprint.

Planning is based on `pakodiazdev/sushigo` `main` at `cfd6cfb`. Sprint 003 exists in the SushiGo
Admin project as a 14-day iteration scheduled for **2026-08-23 through 2026-09-05**. Scope selection
is complete. The sprint was promoted to `doc/sprints/` and officially started on **2026-08-12** by
`#443`, formally closing Sprint 002. The Project iteration window remains the planning cadence; the
repository metadata records the actual lifecycle start.

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
| Completed | — |
| Target calendar duration | 14 days |
| Active workdays | — |

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

No planned-scope change occurred during promotion. Issue `#443` is recorded as startup
documentation under Opportunistic Work rather than silently inflating the ten-Issue implementation
scope. Changes made after promotion must be recorded here without deleting historical rows.

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| — | — | — | None yet | No planned-scope change at sprint start |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-08-12 | #443 | Formally close Sprint 002, promote Sprint 003, and record Sprint 004 planning | Sprint lifecycle transition and planning documents were ready for permanent review | Sprint 002 closed; Sprint 003 promoted; Sprint 004 and roadmap convention submitted together |
| 2026-08-13 | #448 | Move `/issue` automated-review loops to isolated subagents | Review-loop context growth and `finish-pr` approval interruptions required an unplanned reliability pass | Copilot/Devin loops isolated, CI/session safeguards hardened, and file-list captures stabilized; 9.3h tracked; PR #451, merge pending |

## 6. Value Ranking

The ranking below covers the final planned scope. Post-start additions require an explicit scope
change and recalculation rather than automatic backlog intake.

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | `sushigo#430` | Prevent a demonstrated concurrency window from overselling Stock and violating balance integrity |
| **High** | `sushigo#400`, `sushigo#401`, `sushigo#420`, `dev-lab#64`, `dev-lab#68` | Close a latent authorization gap, deliver complete employee identity value, prevent regressions in shared bootstrap, and remove database-inspection friction |
| **Medium** | `sushigo#421`, `dev-lab#67`, `dev-lab#66` | Gate the next Product vertical with reviewed design, improve runtime observability, and replace stale operational guidance |
| **Low** | `dev-lab#65` | Preserve architectural rationale after the behavior has shipped |
| **Deferred** | — | No confirmed dev-lab Issue is intentionally deferred |

### Ordering principle

> **Value first, parallelism second.** Product security, correctness, and data integrity take
> precedence. Within the dev-lab lane, testing and observability land before documentation of the
> final state; Product implementation remains behind its approved design gate.

## 7. Route A — Execution Rounds

These rounds schedule the complete planned dev-lab and SushiGo scope. Any later addition is a scope
change and must update estimates, dependencies, conflicts, and the scope-change log.

### Round 1 — Establish Safety and Runtime Visibility

| Status | Issue | Repository | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---|---:|---:|---:|---|---|
| ⏳ | #64 | `sushigo-dev-lab` | Add Bats coverage and macOS CI for workspace-bootstrap configuration helpers | High | 3h | 6h | — | — | Use `tests/README.md` to avoid a README conflict with #67 |
| ⏳ | #67 | `sushigo-dev-lab` | Add `make status` for a reliable workspace runtime overview | Medium | 2h | 4h | — | — | Distinguish live, degraded, stopped, stale-socket, and unconfigured states |
| ✅ | #401 | `sushigo` | Add administrator-managed employee avatars with reusable initials fallback | High | 4h | 7h | 20.4h | PR #449 | PR ready, merge pending |
| ✅ | #400 | `sushigo` | Enforce permissions in Item, ItemVariant, and InventoryLocation policies | High | 2h | 4h | 3.2h | PR #445 | Merged to `main` (`14ee15f`) |
| ✅ | #430 | `sushigo` | Prevent concurrent stock overselling and enforce balance invariants | Critical | 4h | 8h | 6.9h | PR #447 | Row locks + DB CHECK constraints + reusable StockMutationService; balances repaired/validated after review; PR ready, merge pending |
| ✅ | #421 | `sushigo` | Design the Product Inventory target architecture and migration plan | Medium | 3h | 6h | 3.75h | PR #446 | Domain model, ERD, SlidePanel flow, API outline, TD-03; merged to `main` (`1ff8586`) |
|  |  |  | **Round total** |  | **18h** | **35h** | **—** |  |  |

### Round 2 — Add On-Demand Database Inspection

| Status | Issue | Repository | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---|---:|---:|---:|---|---|
| ⏳ | #68 | `sushigo-dev-lab` | Add opt-in pgAdmin service for the shared PostgreSQL instance | High | 2h | 4h | — | — | Runs after #67 because both modify `Makefile` and `README.md` |
| ⏳ | #420 | `sushigo` | Add self-service avatar editing and complete identity-surface rollout | High | 3h | 6h | — | — | Runs after #401 establishes the shared avatar contract and component |
|  |  |  | **Round total** |  | **5h** | **10h** | **—** |  |  |

### Round 3 — Correct Guidance and Preserve Decisions

| Status | Issue | Repository | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---|---:|---:|---:|---|---|
| ⏳ | #66 | `sushigo-dev-lab` | Normalize and correct troubleshooting guidance | Medium | 2h | 4h | — | — | Replace stale manual deletion/package-lock guidance, not formatting only |
| ⏳ | #65 | `sushigo-dev-lab` | Backfill ADRs for #010, #011, #016, and #68 | Low | 2h | 4h | — | — | Must describe #68's final implementation, not its pre-implementation proposal |
|  |  |  | **Round total** |  | **4h** | **8h** | **—** |  |  |

## 8. Route B — Sequential Dependencies

```text
dev-lab#67 (Round 1) → dev-lab#68 (Round 2)
Type: file-level sequencing.
Reason: both modify Makefile targets/help and README operational documentation. Landing #67 first
lets #68 build on the final command surface instead of resolving avoidable conflicts.

dev-lab#68 (Round 2) → dev-lab#65 (Round 3)
Type: architectural-evidence dependency.
Reason: ADR-005 must capture the implementation that actually shipped — optional Compose profile,
loopback-only exposure, login trade-off, and runtime credential bootstrap — rather than a proposal.

sushigo#401 (Round 1) → sushigo#420 (Round 2)
Type: product and shared-component dependency.
Reason: #401 establishes the backend avatar contract, reusable fallback component, and first
identity surfaces that #420 extends into self-service editing and the remaining application views.
```

`dev-lab#64` is technically independent of the other confirmed Issues when its test documentation
lives under `tests/README.md`. `dev-lab#66` can run independently at the code level, but it is placed
in the final documentation round so its operational guidance reflects the final sprint command
surface.

`sushigo#401` and `sushigo#420` have no dependency on the confirmed dev-lab work. Their product lane
depends on the already merged generic media system from `sushigo#377` and is sequenced internally
to keep the API and reusable frontend component contract stable.

`sushigo#400` is independent of the avatar and dev-lab lanes. Its authorization contract is
already defined by the route middleware and Form Requests; implementation must preserve the
dedicated `items.manage-media` boundary introduced by `sushigo#377`.

`sushigo#430` is independent of the current avatar, policy, and dev-lab implementations. It lands
in Round 1 because the later purchase-receiving backend (`sushigo#432`, outside this sprint) must
reuse its atomic Stock mutation contract rather than create another unsafe path.

`sushigo#421` is intentionally design-only. It may audit the same Inventory areas as #400/#430 but
does not edit production code; Product catalog implementation (`sushigo#422` onward) is excluded
until #421 approves or re-scopes the target contract.

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

### Conflict methodology

Affected files were inferred from each Issue's requested deliverables and confirmed against the
current repository structure on 2026-08-12. The map intentionally treats shared documentation and
Makefile command surfaces as conflict nodes even when the underlying services are independent.

The map covers the final planned scope. #421 must produce a deeper conflict/dependency map for the
future Product roadmap without pulling that implementation into Sprint 3.

## 10. Estimate Tracking by Round

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| Round 1 | 6 | 18h | 35h | — | — | — |
| Round 2 | 2 | 5h | 10h | — | — | — |
| Round 3 | 2 | 4h | 8h | — | — | — |
| **Confirmed dev-lab total** | **5** | **11h** | **22h** | **—** | **—** | **—** |
| Confirmed SushiGo scope | 5 | 16h | 31h | — | — | — |
| **Confirmed sprint total** | **10** | **27h** | **53h** | **—** | **—** | **—** |

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Testing and CI (`dev-lab#64`) | 3h–6h | — | — |
| Operational tooling (`dev-lab#67`, `dev-lab#68`) | 4h–8h | — | — |
| Documentation and ADRs (`dev-lab#66`, `dev-lab#65`) | 4h–8h | — | — |
| Employee identity (`sushigo#401`, `sushigo#420`) | 7h–13h | — | — |
| Inventory authorization and Stock integrity (`sushigo#400`, `sushigo#430`) | 6h–12h | — | — |
| Product Inventory design (`sushigo#421`) | 3h–6h | — | — |
| Code review and validation | Included in Issue estimates | — | — |
| Rework and corrections | Included in Issue estimates | — | — |
| **Confirmed dev-lab total** | **11h–22h** | **—** | **—** |
| **Confirmed sprint total** | **27h–53h** | **—** | **—** |

### Wall-Clock Time & Parallelism

Computed at sprint closure from finalized Issue session arrays, following
`doc/conventions/sprints.md` §7.

- **Person-hours:** —
- **Wall-clock time:** —
- **Parallelization factor:** —
- **Peak concurrency:** —

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| — | — | No sessions yet |

## 12. Notes on Estimate Confidence

The dev-lab estimates were produced after reading the current Issue bodies and auditing the current
repository files on 2026-08-12. Confidence is **medium**:

- `dev-lab#64` is wider than its original body suggests because no CI workflow exists and the
  tested scripts deliberately use macOS-specific `sed -i ''`; the estimate assumes a macOS runner
  instead of an unplanned portability refactor.
- `dev-lab#67` must validate process liveness instead of treating socket existence as sufficient,
  and must define degraded/stale states.
- `dev-lab#68` has the most complete technical scope and acceptance criteria; its main uncertainty
  is runtime-safe pgAdmin credential provisioning and container validation.
- `dev-lab#66` includes correctness work because the current document contains stale destructive
  commands; it is not a formatting-only pass.
- `dev-lab#65` includes a fourth ADR for #68 and therefore must wait for implementation evidence.
- `sushigo#401` was reduced from a broad avatar initiative to an administrator-managed first slice;
  its estimate excludes the self-service profile and broad identity-surface rollout split into
  `sushigo#420`.
- `sushigo#420` was estimated independently after the split and assumes #401's API contract and
  reusable avatar component have landed first.
- `sushigo#400` covers all three unconditional inventory policies and their tests. Its estimate
  assumes the existing permission vocabulary remains unchanged and explicitly excludes a broader
  authorization redesign.
- `sushigo#430` has high variance because meaningful concurrent-request tests and safe first-row
  creation may require database-specific coordination beyond the straightforward row lock.
- `sushigo#421` is capped as design-only. Implementing migrations, APIs, UI, or seeders belongs to
  #422 onward and would be an unplanned scope expansion.

All ten Issue bodies contain their final planned scope, optimistic/pessimistic estimates, and empty
Sessions arrays. Estimates remain planning ranges until execution evidence is recorded.

## 13. Execution Evidence

| Status | Issue | Repository | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---|---:|---|---:|---|
| ⏳ | #64 | `sushigo-dev-lab` | Pending | — | — | — | Final Bats/macOS CI scope recorded in Issue body |
| ⏳ | #67 | `sushigo-dev-lab` | Pending | — | — | — | Final runtime-state semantics recorded in Issue body |
| ⏳ | #68 | `sushigo-dev-lab` | Pending | — | — | — | Already scoped, project-linked, labeled, and assigned to Sprint 3 |
| ⏳ | #66 | `sushigo-dev-lab` | Pending | — | — | — | Correctness changes must be recorded, not hidden as formatting |
| ⏳ | #65 | `sushigo-dev-lab` | Pending | — | — | — | ADR list expands to include #68 |
| ✅ | #401 | `sushigo` | `User` adopts the polymorphic media system (owner-or-`users.update` gating); avatar attach/replace wired through employee create/update, exposed via `EmployeeResource`/`/auth/me`/login response; reusable `<Avatar>` component wired into employee list, detail header, and app header; added a per-adopter upload-context system restricting avatar uploads to images while Item/Dish keep video | PR #449 | — | 20.4h | 25+ PHPUnit tests + Vitest coverage + 1 Cypress happy path passing; Pint/ESLint/TypeScript clean; SonarCloud quality gate passing (0 new smells after cleanup); Copilot review clean; three review-response rounds across Devin/DeepWiki, a separate code-review agent, and SonarCloud fixed 9+ real defects total (attach-transaction atomicity, missing login avatar_url, roles discarded on create, uploader visible to unauthorized/user-less-employee editors, wrong photo on multi-asset create, soft-deleted-gallery and fail-open context validation gaps, a `config()` dot-path 500, a stale-uploader cross-employee leak, cognitive-complexity/lint smells); 1 finding disproven by regression test, 1 confirmed pre-existing/out-of-scope (signed-URL non-determinism, shared with Item/Dish), 1 kept as designed per the issue's own text (`users.update` authorization scope) |
| ⏳ | #420 | `sushigo` | Pending | — | — | — | Self-service editing and remaining identity-surface rollout |
| ✅ | #400 | `sushigo` | Replaced unconditional `return true` stubs in ItemPolicy/ItemVariantPolicy/InventoryLocationPolicy with real Spatie permission checks; 72 new unit assertions | PR #445 | `14ee15f` | 3.2h | 72 policy unit tests + 44 regression tests passing; Pint clean; SonarCloud quality gate passing (100% new coverage); Copilot review clean; Devin/DeepWiki 0 bugs, 2 flags fixed (stale comment, nullable-param footgun), 4 evaluated as false positive/informational |
| ✅ | #430 | `sushigo` | DB CHECK constraints, row-locked stock-out, race-safe StockMutationService for first-receipt creation, and application-layer balance guards | PR #447 | — | 6.9h | 45 new/updated tests, full 1322-test Feature suite regression-clean, Pint clean; Copilot + Devin review findings addressed; follow-up review pass repaired/validated pre-existing balances against the new constraints |
| ✅ | #421 | `sushigo` | Finalized the Product → Variant → Purchase Presentation domain model, ERD, SlidePanel UX flow, API contract outline, and additive-first migration sequencing for #422-#442; recorded TD-03 | PR #446 | `1ff8586` | 3.75h | Design/ERD/UI/API/migration gate only, no production implementation; 4 Copilot threads + 5 Devin review cycles resolved, all real findings |
| 🚧 | #443 | `sushigo` | Sprint lifecycle and planning documentation | — | — | In progress | Opportunistic startup work; branch and PR carry the session-created documentation |
| ✅ | #448 | `sushigo` | Isolated Copilot and Devin review loops into foreground workers and hardened unattended close-out safeguards | PR #451 | — | 9.3h | Docs/command-file change, no test suite: `git diff --check`, frontmatter/allow-list, and compact-contract/safe-capture structural assertions all passing; 6 Copilot review threads resolved (SHA-anchored re-checks, idempotent session cleanup, squash-verification stabilization, allow-list completion, canonical-body dispute sourcing); PR ready, merge pending |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Dev-lab automated tests | No Bats suite or CI workflow | Bats suite and green macOS CI | — | ⏳ |
| Workspace runtime visibility | Per-workspace manual checks | One reliable status command | — | ⏳ |
| Database inspection | `psql` or external manual configuration | Host-only, preconfigured pgAdmin on demand | — | ⏳ |
| Troubleshooting consistency | Mixed formats and stale commands | Every entry has symptom/Cause/Fix and current safe guidance | — | ⏳ |
| Recorded dev-lab ADRs | 1 | 5 | — | ⏳ |
| Inventory authorization stubs | 3 policies authorize unconditionally | Exact permission-backed policies with negative/positive tests | — | ⏳ |
| Concurrent Stock mutation | Read-then-decrement window can approve the same available units twice | Atomic mutation plus enforced balance invariants | — | ⏳ |
| Product Inventory target design | Discovery exists only in planning discussion/backlog | Reviewed ERD, UI flow, API outline, migration plan, and dependency map | — | ⏳ |
| SushiGo tests and quality gates | TBD | 100% relevant checks passing, 0 new security findings | — | ⏳ |

## 15. Results

### 15.1 Delivered Value

Not yet delivered. Expected dev-lab value is a safer, observable, inspectable, and better-documented
parallel-development environment. Expected SushiGo value is end-to-end employee identity, safer
Inventory authorization and Stock mutation, and an implementation-ready Product Inventory design.

### 15.2 Planned vs. Actual

- **Confirmed planned Issues:** 5 dev-lab Issues and 5 SushiGo Issues.
- **Pending planned Issues:** 0; scope selection is complete.
- **Opportunistic Issues:** 2 (`#443`, `#448`), tracked outside the ten-Issue implementation total;
  `#443` covers sprint startup and `#448` covers in-progress pipeline reliability work.
- **Confirmed estimate:** 27h optimistic / 53h pessimistic.
- **Completed:** 0.
- **Deprecated or cancelled:** 0.
- **Tracked:** 9.3h for opportunistic #448; planned-scope totals remain separate.

### 15.3 Known Limitations

- Sprint 003 officially started on 2026-08-12. Its GitHub Iteration retains the previously agreed
  2026-08-23 through 2026-09-05 planning window, while repository metadata records actual start.
- Product catalog implementation remains outside Sprint 3. #421 may change #422 onward before a
  later sprint selects those implementation Issues.
- The 27h–53h range assumes conflict-aware parallel execution; it is engineering effort, not
  elapsed calendar time.
- Project assignment alone does not imply implementation. The ten planned implementation rows
  remain pending; only opportunistic startup documentation `#443` is in progress.

## 16. Lessons Learned

Planning lesson recorded before execution: development-platform work must be represented in the
same sprint evidence as product work when it consumes real agent capacity. Omitting dev-lab Issues
would understate person-hours, hide dependencies that affect every workspace, and make the
parallelization metrics incomplete.

Additional lessons will be added from actual execution evidence.

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | #422–#429 | Deliver the Product → Variant → Purchase Presentation catalog vertical | Intentionally gated by the reviewed target design from #421 | Sprint 004 |
| ⏳ | #431–#437 | Deliver purchasing, acquisition cost, price lists, and operational seed data | Depends on the Product catalog completed in Sprint 4 | Sprint 005 |
| ⏳ | #438–#442 | Complete Stock integrity, access, navigation, and legacy cleanup | Requires the replacement operational domains before final cleanup | Sprint 006 |
| ⏳ | TBD | Reassess dev-lab portability only if Linux support becomes a product need | Explicitly excluded from #64's macOS-focused CI scope | Future |

## 18. Sprint Closure Checklist

- [x] SushiGo application Issues were selected before sprint promotion.
- [x] Every included Issue is linked to SushiGo Admin, labeled `sprint-3`, and assigned to the
      `Sprint 3` iteration.
- [ ] All included work items have a final status marker.
- [ ] Completed items include Pull Request or commit evidence.
- [ ] Deprecated items identify their replacement.
- [ ] Cancelled items include a reason.
- [ ] Scope changes are recorded.
- [ ] Tracked time was synchronized from Issue sessions.
- [ ] Round totals and sprint totals were recalculated.
- [ ] Estimate variance was calculated.
- [ ] Consolidated effort was completed.
- [ ] Wall-clock time, parallelization factor, and peak concurrency were computed
      (`doc/conventions/sprints.md` §7).
- [ ] Dependencies reflect actual execution.
- [ ] Conflict notes reflect actual execution.
- [ ] Tests and relevant quality metrics were recorded.
- [ ] Delivered value and known limitations were documented.
- [ ] Follow-up work was created or recorded.
- [ ] Lessons learned were captured.
- [ ] Metadata dates and status were updated.
- [ ] The next sprint was promoted or created when applicable.
