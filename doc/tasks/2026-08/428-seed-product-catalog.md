# 🌱 Seed realistic SushiGo Products, Variants and Purchase Presentations

**Labels:** backend, sprint-4, investment: product-engineering

## Description

Create Testing, Fakes and Development seed data that demonstrates the complete Product catalog story.

## Reason

The redesigned catalog must be immediately useful for development, demos, deterministic tests and pagination checks without inventing permanent financial data.

## Objective

Seed realistic Brands, Categories, Products, Variants, images where stable and reusable Purchase Presentations.

## ✅ Technical Tasks

- [x] Create deterministic Testing fixtures and volume-oriented Fakes.
- [x] Create believable Development catalog data for Coca-Cola, Buldak, Peelez, Ramune and Mochis after confirming exact spellings/sizes/flavors.
- [x] Demonstrate single- and multi-Variant Products, Unit/Pack/Box templates, barcodes and inactive records.
- [x] Follow config-driven seeder data and restore-on-reseed conventions.
- [x] Add idempotency, restoration and representative-shape tests.

## 🎯 Acceptance Criteria

- [x] Testing data is minimal/deterministic; Fakes support volume; Development tells a believable story.
- [x] Re-running seeds restores intended soft-deleted records without duplicates.
- [x] Catalog seeds contain no invented permanent cost, supplier, purchase, stock or branch price.
- [x] Representative Products render through the new API contracts.

## 🔗 References

- Depends on #422, #424 and #426

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `5h 21m`

### 📅 Sessions
```json
[
  { "date": "2026-08-21", "start": "00:42", "end": "06:03" }
]
```

## 📊 Retrospective
- **Actual total:** 5h 21m (single session)
- **vs optimistic:** +2h 21m
- **vs pessimistic:** −39m

**Justification:**

This landed inside the pessimistic estimate, but past optimistic, mainly because the deliverable was
four new seeder classes across all three tiers (Development/Testing/Fakes) plus a full test suite
(idempotency, restoration, representative-shape and a real API-contract integration test) — not a
single seeder. A real-world-facts blocker (exact Buldak/Peelez names, flavors and sizes, flagged in
the architecture doc as needing confirmation) had to be resolved via web research since this ran
unattended with no human to ask. The bulk of the elapsed time was automated review cycles rather than
new coding: the Copilot loop found one real gap (an unset `sku` field); the Codex loop ran three full
cycles and each surfaced a genuine defect — invalid GTIN check digits on seeded barcodes, a
default-presentation constraint violation on re-seed, and a shared-trait bug (`RestoresTrashedOnUpsert`
preferring to restore an older trashed duplicate over a live replacement) that also benefits the
pre-existing Dish seeders. Every finding was a real defect worth fixing, not review noise — none were
business-rule disputes requiring an override.




