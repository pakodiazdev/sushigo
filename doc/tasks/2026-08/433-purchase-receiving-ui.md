# ✨ Add purchase receiving UI with promotions and effective unit cost preview

**Labels:** enhancement, frontend, sprint-5, investment: product

## Description

Build the Purchase Receipt workflow for selecting Supplier offerings, receiving packages and previewing normalized units and acquisition cost.

## Reason

Operators should enter the commercial transaction they actually performed instead of manually converting boxes into units or editing Stock.

## Objective

Deliver draft/post/detail UI whose calculations and final evidence match the Purchase Receipt backend.

## ✅ Technical Tasks

- [x] Build receipt list, create/edit draft and posted detail states.
- [x] Select Supplier, destination location, Variant Purchase Presentation and supplier offering.
- [x] Capture paid, received and bonus packages, discounts and allocated expenses.
- [x] Preview base units and effective acquisition cost using the same contract as the backend.
- [x] Add confirmation, validation, error recovery, immutable posted display and reversal entry point.
- [x] Add component/integration tests and a real-stack happy-path E2E.

## 🎯 Acceptance Criteria

- [x] Users never enter a manual package conversion factor in a receipt.
- [x] Preview clearly distinguishes packages paid from packages physically received.
- [x] Posted detail displays the canonical backend calculation and cannot be edited.
- [x] Failures do not lose a valid draft or present an unposted receipt as posted.

## 🔗 References

- Depends on #432

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `6h` · **Pessimistic:** `11h` · **Tracked:** `2h55m`

### 📅 Sessions
```json
[
  { "date": "2026-08-25", "start": "17:58", "end": "18:29" },
  { "date": "2026-08-25", "start": "18:29", "end": "20:06" },
  { "date": "2026-08-25", "start": "20:06", "end": "20:53" }
]
```

## 📊 Retrospective
- **Actual total:** 2h55m (31m + 97m + 47m)
- **vs optimistic:** -3h 05m
- **vs pessimistic:** -8h 05m

**Justification:**
The first session (31m) built the feature itself: the backend contract (#432,
`Receipt`/`ReceiptLine`) was already merged and unambiguous, and two very recently built sibling
frontend features (#431 Supplier Offerings, #436 Price Lists) already established every UI pattern
needed — cascading selects, the single-`SlidePanel` state machine, `ConfirmDialog` with an
optional-reason textarea, `useFormMutation`/RHF+Zod — so implementation was mostly composition of
existing, proven patterns.

The second session (97m) was entirely review-response and hardening, run via `/pr-comments` and a
manual second pass: Copilot and Codex left 5 threads on the initial PR, 3 of which were genuine
bugs rather than nitpicks — a permission-alignment gap (a `receipts.manage`-only role could open
the form but every lookup endpoint it needs would 403; fixed by widening 6 list endpoints the same
way #505 did for `suppliers.manage`, with new PHPUnit coverage and architecture-doc updates), a
product catalog pagination gap (only the first 100 products were ever selectable), and a
stale-supplier-offering bug (changing the header Supplier didn't clear an already-picked line
offering, since react-hook-form doesn't emit a change event for a vanished option). A manual
second review round then caught two more real bugs of the same shape: `discounts` /
`allocated_expenses` / `non_recoverable_taxes` couldn't be cleared to blank even though the backend
treats them as nullable, and the Cypress spec asserted the wrong post-confirmation banner text
(future tense from the confirm dialog instead of the posted detail's actual present-tense copy).
This session also included a `/rebase-main` onto #434, which merged during the review-response
window and needed a small additive conflict resolved in the shared sprint doc. None of this was
scope creep — the review passes were doing exactly what they're for, and every finding they
surfaced was real.

The third session (47m) was `/finish-pr`'s own close-out cycle plus a SonarCloud pass. Devin's
automated scan (run as part of `/finish-pr`'s Phase 7.6) surfaced one more real, narrow bug — the
variant dropdown in a receipt line only loaded the first 100 variants of a Product, the same
pagination gap already fixed for the product list itself — fixed and covered with a test, which
required repeating the squash/push/CI cycle once. Two CI jobs also failed once each across the two
validation rounds (a Postgres unique-constraint race in one API test shard, and an unusually slow
webapp test shard) — both passed clean on an unmodified retry, confirming they were flaky
infrastructure noise rather than regressions. `/sonar-review` then found and fixed 2 lingering
SonarCloud code smells (nested ternaries in `receipts-page.tsx`) that hadn't blocked the quality
gate but were worth cleaning up before merge.

