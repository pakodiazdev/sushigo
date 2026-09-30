# 🧪 Fix quarantined Cypress spec: attendance-extra-day-express.cy.ts

**Labels:** investment: dev-platform, sprint-9

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/attendance-extra-day-express.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Happy-path test fails: employee name <p> "not visible because clipped by a parent element" (overflow/scroll).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/attendance-extra-day-express.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `~45m` (reconstructed activity estimate; observed blocks total 44m39s)

### 📅 Sessions
```json
[
  {
    "date": "2026-09-23",
    "start": "21:29:34",
    "end": "21:30:17"
  },
  {
    "date": "2026-09-24",
    "start": "00:17:20",
    "end": "00:22:21"
  },
  {
    "date": "2026-09-24",
    "start": "00:51:07",
    "end": "00:55:49"
  },
  {
    "date": "2026-09-26",
    "start": "18:05:14",
    "end": "18:09:36"
  },
  {
    "date": "2026-09-27",
    "start": "14:24:24",
    "end": "14:35:40"
  },
  {
    "date": "2026-09-27",
    "start": "14:52:34",
    "end": "14:52:56"
  },
  {
    "date": "2026-09-27",
    "start": "18:00:02",
    "end": "18:00:40"
  },
  {
    "date": "2026-09-27",
    "start": "18:29:24",
    "end": "18:35:04"
  },
  {
    "date": "2026-09-30",
    "start": "15:55:16",
    "end": "16:06:09"
  },
  {
    "date": "2026-09-30",
    "start": "16:11:14",
    "end": "16:12:16"
  }
]
```

## 📊 Retrospective
- **Reconstructed total:** approximately 45m (observed activity blocks: 44m39s).
- **Block breakdown:** 43s + 301s + 282s + 262s + 676s + 22s + 38s + 340s + 653s + 62s = 2679s.
- **vs optimistic:** approximately +15m against 30m.
- **vs pessimistic:** approximately -2h15m against 3h.

**Justification:**
The previous 90h16m value incorrectly counted the uninterrupted calendar interval from an abandoned September 24 session to September 27 as tracked effort. It has been removed. The original implementation, resumed validation, rebase, and finish-pr activity were reconstructed from timestamped assistant session events, cross-checked against the Git reflog and Cypress/CI logs. Only events for issue #538 before this time-record correction were included. All timestamps below use America/Mexico_City; seconds are retained so the reconstructed blocks can be summed without rounding each block.

**Method and limitations:**
Each block spans consecutive recorded events with no gap greater than five minutes. Longer gaps split the blocks and are excluded entirely, including multi-day pauses and long pending-tool intervals. Short test/CI waits inside a block remain included. This is a reproducible estimate of observed activity, not a precise measurement of hands-on engineering time or total CI runtime; the five-minute cutoff is a reconstruction assumption. The Sessions entries are reconstructed intervals, not contemporaneously recorded start/stop sessions. The work remained a selector-scoping correction and quarantine removal, followed by two local E2E runs, CI validation, rebase, and close-out. No evidence supports 90 hours of effective work.
