# 📘 Align Inventory OpenAPI identifiers with public ULID contracts

**Labels:** documentation, backend, 🔨 technical-debt, investment: product-engineering, sprint-8

## Description

Audit and correct OpenAPI contracts for Inventory resources migrated to public ULIDs by #399. The
Sprint 5 review found runtime controllers resolving `public_id` strings while Swagger still
described some path parameters or schemas as integer IDs.

## Reason

The generated OpenAPI document and any client generated from it are a contract external consumers
rely on. Since #399 migrated Inventory resources to public ULIDs at runtime, a Swagger document
that still describes some of those same identifiers as integers is actively wrong — it misleads
API consumers, breaks generated-client type safety, and lets the drift silently reappear on new
endpoints (Sprint 7 #567–#574) unless it is audited and locked down with a regression check.

## Objective

Generated OpenAPI and generated clients describe the same identifier contract the application
actually accepts and emits: external ULID strings, internal numeric keys never exposed.

## Technical Tasks

- [x] Generate the current OpenAPI document and inventory every Inventory/Product/Purchasing/Pricing
      path parameter, request FK, response ID, nested relation, filter, and example affected by #399.
- [x] Correct type/format/descriptions/examples to ULID strings for public identifiers.
- [x] Distinguish true numeric business values from identifiers; do not apply a blind replacement.
- [x] Remove stale numeric-ID prose from controllers, schemas, architecture, and API examples.
- [x] Add an automated contract test/linter that compares known public-ID route parameters and
      serialized resource IDs against generated OpenAPI types.
- [x] Verify generated-client compatibility or document any intentional breaking correction.

## Acceptance Criteria

- [x] Every external Inventory identifier migrated by #399 is documented as a string/ULID.
- [x] No internal primary key is documented or serialized as a public contract.
- [x] Product, Variant, Location, UOM, Stock, Movement, Presentation, Supplier, Receipt, and Pricing
      relationships are included in the audit.
- [x] Swagger generation passes and the regression check fails on a reintroduced integer-ID schema.
- [x] Bilingual architecture/API examples match runtime behavior.

## Dependencies and Parallelization

- Incorporate Sprint 7 #567–#574 endpoints before closing the audit so new contracts are covered.
- Independent from valuation implementation and suitable for a parallel documentation/API lane.

## Out of Scope

- Changing database primary keys, URL shapes unrelated to identifier type, or regenerating every
  external client application.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `5h` · **Tracked:** _in progress_

### 📅 Sessions
```json
[
  { "date": "2026-09-11", "start": "20:00", "end": "21:03" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 3m (63m)
- **vs optimistic:** −57m (under)
- **vs pessimistic:** −3h 57m (under)

**Justification:** The tracked session covers the initial audit-and-fix pass: a background fork
read all ~140 candidate files across the Inventory/Product/Purchasing/Pricing domain and cross-
referenced them against a Python-scripted sweep of the generated OpenAPI document, surfacing 6
genuine runtime defects (not just stale docs) alongside the documentation corrections and a new
regression test. That work finished within the optimistic estimate because the audit was
systematic rather than exploratory — the `HasPublicId` trait boundary gave a precise, mechanical
list of what to check.

The recorded 1h 3m understates real elapsed effort — three further review-response rounds happened
in the same continuous work stretch after this session was formally closed, none of which open a
Sessions entry under the current convention:
- `/pr-comments` addressed 2 Codex-flagged P1 defects on `GET /item-variants` (a query filter
  comparing a ULID against a numeric column, and unmapped foreign keys in the list response).
- A manual review caught a third defect: an unguarded type coercion in the UOM Conversion
  duplicate-pair check that would 500 on a malformed `from_uom_id`.
- `/sonar-review` then found and NOSONAR'd the resulting unused-parameter smell that fix
  introduced, and a second `/pr-comments` round caught the audit's largest remaining gap —
  `RegisterStockOutController` used PHP-attribute OpenAPI syntax instead of docblocks, so every
  earlier grep-based sweep missed it entirely; its response leaked three FK columns as raw
  integers at runtime, and the regression test's own FK/inline-schema coverage was gapped, both
  now fixed.

None of this is reflected in `Tracked` above — a tracking gap in the tooling (no session-opening
mechanism exists for `/pr-comments` or ad-hoc review rounds), not a claim that the PR was done in
63 minutes end to end.






