# 🔐 Decouple reference-data lookup access from workflow OR permissions

**Labels:** backend, frontend, 🔨 technical-debt, investment: product-engineering, sprint-8

## Description

Replace the growing workflow-specific OR-permission lists on Product/Variant/Presentation and other
lookup routes with an explicit, reusable reference-data access contract.

The Sprint 5 review identified the emerging pattern:

```text
items.view | suppliers.manage | receipts.manage | future-consumer.manage | ...
```

Sprint 7 introduces more Inventory workflows, so the review's trigger for re-evaluation has now
arrived.

## Reason

The OR-permission list on lookup routes (`items.view | suppliers.manage | receipts.manage | ...`)
grows by one clause every time a new workflow needs read-only access to Product/Variant/Location/UOM
reference data. This couples unrelated workflows' authorization to a single route's permission
string, makes it easy to either over-grant (reusing an unrelated `.manage` permission just to get
read access) or under-grant (forgetting to add a new workflow's clause) access, and was flagged as
technical debt in the Sprint 5 review. Sprint 7 added several more Inventory workflows, which is the
review's own stated trigger to re-evaluate before Sprint 8 adds even more lookup consumers.

## Objective

Authorized workflows can read only the active, scoped reference data they need without granting
catalog-management access or appending every new workflow permission to every lookup route.

## Technical Tasks

- [x] Inventory all workflow lookup cascades and their current OR permissions: Product, Variant,
      Purchase Presentation, Supplier/Offering, Location, UOM, and related filters.
- [x] Define a dedicated capability/policy contract such as `inventory_catalog.lookup`, or a
      centralized workflow-aware authorization service if one permission would be too broad.
- [x] Preserve least privilege: lookup access never implies create/update/delete catalog access.
- [x] Apply Operating Unit scope, active/soft-delete rules, parent-child consistency, pagination,
      search, and selected-record behavior consistently.
- [x] Migrate routes/controllers/OpenAPI away from duplicated OR strings without breaking existing
      roles authorized through Suppliers or Receipts.
- [x] Seed/migrate permissions idempotently and document role implications.
- [x] Provide one reusable frontend query contract for workflow selectors where response semantics
      are equivalent.

## Tests

- [x] Permission matrix for catalog viewer, supplier manager, receipt manager, future Inventory
      operator, unauthorized user, inactive membership, and admin bypass.
- [x] Direct public-ID/filter attacks cannot escape the active Operating Unit.
- [x] Lookup-only users cannot mutate catalog resources.
- [x] Existing Supplier and Receipt cascades continue working with pagination/search beyond page 1.
- [x] OpenAPI and route middleware remain synchronized.

## Acceptance Criteria

- [x] New workflows do not require extending long OR-permission strings across lookup routes.
- [x] One documented contract explains reference-data access separately from catalog management.
- [x] Least privilege and Operating Unit isolation are preserved end to end.
- [x] Existing Supplier/Receipt workflows retain access without gaining mutation capabilities.
- [x] Tests cover every role and direct-ID/filter bypass boundary.

## Dependencies and Parallelization

- Starts after Sprint 7 #568/#569/#572 stabilize their Location/Receipt lookup needs.
- Should precede Sprint 8 Count, Adjustment, Return, and Reservation forms so they consume the new
  contract rather than add more OR branches.
- Can run in parallel with valuation and OpenAPI audit work.

## Out of Scope

- Replacing the global RBAC library, redesigning role administration, or exposing inactive catalog
  data to operational workflows.

## Investment Type

`investment: product-engineering`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h`
- **Pessimistic:** `8h`
- **Tracked:** `55m`

### 📅 Sessions
```json
[
  { "date": "2026-09-11", "start": "19:50", "end": "20:45" }
]
```

## 📊 Retrospective
- **Actual total:** 55m (55m)
- **vs optimistic:** −3h 5m (under)
- **vs pessimistic:** −7h 5m (under)

**Justification:** The scope resolved cleanly against existing codebase patterns — the six affected
lookup routes, their exact OR-permission strings, and the two backward-compatible consumers
(`suppliers.manage` #505, `receipts.manage` #433) were all discoverable directly from route
comments and existing tests, so no design exploration or rework was needed. The chosen design (one
constants class plus a single new permission, preserving the two existing exceptions verbatim)
kept every existing test passing unchanged on the first run — the full `Feature/Inventory` suite
(793 tests) and the full Vitest suite (4618 tests) both passed without follow-up fixes. The
estimate likely assumed either a heavier Gate/Policy abstraction or a data-migration/backfill
script for already-provisioned permission holders; this session found the existing project
precedent (#275) of adding a new permission via the `LockedSeeder` files alone, which avoided that
larger scope.


