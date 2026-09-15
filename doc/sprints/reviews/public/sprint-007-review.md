---
sprint: "007"
visibility: public
review_type: engineering-review
review_origin: post-sprint-review-verified-against-repo
review_date: 2026-09-15
reviewed_head: 6c5a035388bde443b1ff9ef5ca7c7580bb3b3a86
---

# Sprint 007 — Warehouse Receiving & Location-Aware Stock

## Executive summary

Sprint 007 turned the Sprints 4–6 purchasing/Stock foundations into an explicit, auditable
warehouse workflow — receiving-eligible destinations, one idempotent inbound posting primitive,
managed assortment independent of physical balance, internal Transfers, and a read-only Movement
ledger — while also consolidating six independent PR-validation workflows into one visible,
mode-aware CI quality-gate DAG.

```text
Green main CI (one visible DAG, one stable ci-gate)
        ↓
Idempotent inbound posting (Receipt + Opening Balance share one primitive)
        ↓
Location-scoped, assignment-aware balance ← → auditable internal Transfer
        ↓
             paginated, OU-scoped Movement ledger
```

**Project checkpoint: ~9.2/10.**

**Sprint review: ~9.2/10.**

These scores are subjective review checkpoints, not project KPIs or certifications.

## Major outcomes

- Six independent PR-validation workflows replaced by one `ci.yml` orchestrator with a single
  stable `ci-gate` required check and three execution modes (`#560`).
- Four quarantined Inventory/Purchasing Cypress specs restored and green (`#544`, `#547`, `#548`,
  `#549`).
- One idempotent inbound posting primitive (`InventoryEntryPostingService`) adopted by both Receipt
  and Opening Balance posting, backed by a partial-unique source-line index (`#567`).
- Purchase Receipts now validate an explicit `can_receive_purchases` destination at save time and
  again under lock at post time (`#568`, `#572`).
- Managed assortment (`variant_location_assignments`) exists independently of physical Stock, so an
  assigned Variant projects as zero on-hand without a fake Stock row (`#569`, `#571`).
- Auditable draft/post/reverse internal Stock Transfers with deterministic Location/Variant lock
  ordering and immutable movement evidence (`#573`).
- A paginated, Operating-Unit-scoped Stock Movement ledger and detail UI with reversal linkage
  (`#574`).

## Delivery evidence

| Metric | Result |
|---|---:|
| Planned scope | 13 Issues |
| Delivered | 13/13 |
| Planned effort | 57–115 h |
| Formal tracked effort | 33h 17m |
| Opportunistic tracked effort | 4h 53m (`#598`); `#582` unfinalized (0m recorded) |
| Total tracked effort | 38h 10m |
| Wall-clock (formal scope) | 28h 55m |
| Parallelization (formal scope) | 1.15× (peak concurrency 4) |

Formal delivery landed at 58% of the optimistic estimate and 29% of the pessimistic one. That
result is credible for the same reason as Sprints 4–6: every Issue composed an already-merged
contract (`OperatingUnitScope`, the `#438` immutable-movement model, SAC + FormRequest + Resource)
instead of designing one — it should not be read as a signal that future Inventory work will
routinely land at a third of its pessimistic estimate, especially once real monetary/valuation
arithmetic (Sprint 8) enters the picture.

## Verification performed for this review

Independently re-run against `main` at the reviewed head, not merely read from the sprint document:

- **382 focused API tests passed** (1,006 + 677 assertions) across
  `VariantLocationAssignmentCrudTest`, `InventoryEntryPostingServiceTest`,
  `OpeningBalancePreviewTest`, `OpeningBalanceTest`, `StockMovementLedgerTest`, `StockTransferTest`,
  `StockMovementReverserTest`, and `InventoryEntryPostingDataTest`.
- **48 focused Vitest tests passed** across the `features/inventory/transfers` slice (API contract,
  form hook, form component, detail view, page, and page hook).
- Confirmed on disk: `inventory_locations.can_receive_purchases` migration
  (`2026_09_03_000000_add_can_receive_purchases_to_inventory_locations_table.php`) and the
  `/api/v1/inventory/movements` list/show routes.
- Confirmed the six legacy PR-validation workflow files are gone and `.github/workflows/ci.yml` +
  three reusable `_*-ci.yml` branches are the only PR-validation surface, matching `#560`'s claim.
- **Reproduced a still-open issue while verifying a claimed fix** — see Material Finding below.

## Strong architectural signals

1. **Idempotency by document identity, not by request deduplication.** `InventoryEntryPostingService`
   keys on an explicit source-line identity with a database partial-unique index as the backstop,
   not merely an application-level check — replay-safe under concurrent retries.
2. **Assortment and balance are deliberately separate sources of truth.** A Variant can be "managed
   at a Location" before it has ever moved, without a synthetic zero Stock row — read paths prove
   this with `LEFT JOIN`-based projection tests, not assumption.
3. **Destination eligibility is re-checked where it matters.** Save-time `422` and post-time `409`
   under lock means a Location that becomes ineligible between draft and post cannot silently
   receive inventory.
4. **CI consolidation was proven functionally, not just structurally.** `#560`'s three execution
   modes were verified live (empty-`[e2e-test]` guard fails, `[wip]` never merge-eligible, full DAG
   gates `ci-gate`) before the legacy workflows were deleted.
5. **Quarantine restoration stayed conflict-free by construction.** Four Cypress specs, four
   disjoint files, peak concurrency 4 in one evening — the same pattern Sprint 8 later reused for
   its own quarantine backlog.

## Previous-review disposition

Sprint 006's review carried seven findings forward. Sprint 7 was scoped to resolve exactly one of
them directly (navigation E2E); the rest were deliberately sequenced into Sprint 8, per the
dependency chain Sprint 006's own review recommended.

| Sprint 006 finding | Sprint 007 result |
|---|---|
| Navigation E2E quarantine | **Resolved directly in Sprint 7** — `#544` removed the `#490` guard (PR #610) |
| Ambiguous legacy thresholds not durably archived | **Still unaddressed** — no remediation Issue was ever filed; unchanged since Sprint 006, now spanning two more sprints without a decision either way |
| Redundant movement-line Variant/base quantity | Deferred as planned; **resolved in Sprint 8** by `#575` (verified merged, `2388df3b`) |
| Shared Inventory UI states/copy | Deferred as planned; **resolved in Sprint 8** by `#576` (verified merged, `2b1d4f91`), with the deep CRUD form-field copy explicitly split into its own tracked follow-up (`#624`) |
| Route helper warnings and lazy boundaries | Deferred to `#577`, which **shipped route-level lazy loading** (verified merged, `09f5fee0`) but **did not eliminate the warning** — see Material Finding below |
| API transaction poisoning / DB isolation | **Resolved** — `#578` is closed, but see the tracking-gap finding below |
| Receipt reversal valuation | Deferred as planned; **resolved in Sprint 8** by `#579` (verified merged, `37e7bd7c`) |

## Material engineering findings

### Medium — the route/helper-file warning `#577` was assigned to fix still reproduces

**What was found.** Sprint 006's review flagged that TanStack Router's route scanner emits
warnings for non-route helper/test files living under `src/pages` (e.g.
`pages/inventario/use-products-list.ts`), and that disposition explicitly named `#577` to "fold in
... a reusable placement/ignore convention" alongside its lazy-loading work. `#577` merged and did
deliver measured lazy-route splitting (`doc/conventions/frontend/routing-structure.md`), but running
`npx vitest run src/features/inventory/transfers` against the current `main` head still reproduces
the same warning class for over 20 files under `src/pages`, including the exact file the Sprint 006
review named.

**Why it matters.** A disposition entry that says an Issue "already owns" a fix should mean the fix
landed. Here the Issue owner correctly delivered its stated primary objective (lazy loading) but the
secondary item folded into it did not ship, and no sprint document flagged the gap — a reader
following the disposition trail would reasonably believe this was closed.

**Where.** Warning reproduced during Vitest execution; representative offenders include
`src/pages/inventario/__tests__/*.test.ts(x)`, `src/pages/attendance/**/__tests__/*`, and
`src/pages/inventario/use-products-list.ts` itself (the file the Sprint 006 review named directly).

**Disposition.** Not yet re-filed as its own Issue. Recommend a small, scoped follow-up: either move
these test/helper files out of `src/pages` (per the domain-oriented structure convention) or add an
explicit router-scan ignore pattern for `__tests__/` and `use-*.ts` helper files under `src/pages`.

---

### Low — `#578` carries a stale `sprint-8` label from before Sprint 8 existed

**What was found.** `#578` ("Eliminate API test transaction-poisoning and database-isolation
flakes") merged via PR `#594` on 2026-09-02 — inside Sprint 007's own window (2026-08-30 →
2026-09-09) and a full week before Sprint 008 was promoted. Sprint 007's own §15.2 correctly lists
it as "same-window work outside Sprint 7 scope" per `doc/conventions/sprints.md` §5 — the right
treatment, since it was real in-window engineering time the sprint never formally claimed. But the
Issue itself now carries a `sprint-8` label, which the Sprint 008 closure audit run during this
session correctly flagged as an `orphan` (a `sprint-N` label with no corresponding row in that
sprint's formal scope).

**Why it matters.** The audit's own convention (`doc/conventions/sprint-closure-audit.md` §5) is
explicit that this is disclosed, not blocking, and that an orphan's effort is "never dropped just
because it was also mislabelled" — so there is no missing evidence and no process violation here,
only a stale label that could confuse a future label-based sweep into thinking `#578` was Sprint
8 scope.

**Where.** GitHub issue `#578`'s `sprint-8` label.

**Disposition.** Cosmetic. Either remove the `sprint-8` label (it was closed before Sprint 8
existed) or leave it and rely on the audit's WARN to keep surfacing the drift — no sprint document
needs to change.

## Follow-up disposition summary

| Finding | Disposition |
|---|---|
| Legacy thresholds not durably archived | Still open, now spanning three sprints without a decision — recommend explicitly closing (no real risk found) or filing the audit Issue Sprint 006 already proposed |
| Route helper/lazy-boundary warning | Reopen — not resolved despite the existing disposition; small scoped follow-up recommended |
| `#578` carries a stale `sprint-8` label | Cosmetic — remove the label or accept the disclosed audit WARN |
| Redundant movement-line Variant/base quantity | Resolved (Sprint 8 `#575`) |
| Shared Inventory UI states/copy | Resolved (Sprint 8 `#576`), residual form-copy tracked as `#624` |
| Receipt reversal valuation | Resolved (Sprint 8 `#579`) |
| Navigation E2E quarantine | Resolved (Sprint 7 `#544`) |

## Next checkpoint

Sprint 008 already merged all ten of its own scoped Issues (verified in an earlier session pass):
the exact-money contract's Phase 1, reversal valuation, movement-line pruning, lookup
authorization, OpenAPI ULID accuracy, Inventory UX states, and route-level lazy loading. The next
review should specifically verify:

- whether `#621` (the exact-money contract's deferred Phase 2) has a committed schedule, since
  Sprint 008 shipped only the Receipt-path slice;
- whether the `#577` warning gap identified here gets a real follow-up before more `src/pages`
  files accumulate the same pattern;
- Sprint 009's release-pipeline chain (`#632`–`#637`), the first sprint aimed at real
  QA/Demo/Production deployment rather than local dev-lab workspaces only.

## Source of truth

- [`doc/sprints/sprint-007-warehouse-receiving-and-location-aware-stock.md`](https://github.com/pakodiazdev/sushigo/blob/main/doc/sprints/sprint-007-warehouse-receiving-and-location-aware-stock.md)
- Reviewed head: [`6c5a0353`](https://github.com/pakodiazdev/sushigo/commit/6c5a035388bde443b1ff9ef5ca7c7580bb3b3a86)
