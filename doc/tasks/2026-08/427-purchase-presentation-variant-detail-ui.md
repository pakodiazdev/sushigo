# ✨ Add Purchase Presentation management to embedded Variant detail

**Labels:** enhancement, frontend, sprint-4, investment: product

## Description

Manage reusable Purchase Presentation assignments from the embedded Variant detail.

## Reason

Operators should configure commercial packages in the Product workflow and understand their effect in base inventory units.

## Objective

Let authorized users assign, edit, default, deactivate and reactivate Variant Purchase Presentations and manage reusable templates.

## ✅ Technical Tasks

- [x] Show presentation, package type, factor, package barcode, default and status.
- [x] Assign an existing template and edit/deactivate/reactivate the Variant association.
- [x] Provide an authorized secondary template manager for reusable package definitions.
- [x] Explain normalization in user language, for example: 1 Box x24 adds 24 pieces.
- [x] Surface duplicate and UOM-compatibility errors without losing nested panel state.
- [x] Add accessibility, cache synchronization, component tests and one Product → Variant → Presentation E2E flow.

## 🎯 Acceptance Criteria

- [x] The full presentation lifecycle works inside Variant detail.
- [x] Users cannot create an untracked per-Variant factor that conflicts with its selected template.
- [x] Default and compatibility rules are understandable before submission and enforced by the API.
- [ ] Frontend tests and E2E pass.

## 🔗 References

- Depends on #425 and #426

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `7h` · **Tracked:** `7h48m`

### 📅 Sessions
```json
[
  { "date": "2026-08-21", "start": "00:42", "end": "08:30" }
]
```

## 📊 Retrospective

**Tracked:** 7h48m (1 session, 2026-08-21 00:42–08:30) vs. optimistic 4h / pessimistic 7h — about
48m over the pessimistic estimate.

The overrun came almost entirely from the automated-review phase, not the implementation itself.
Research (confirming the backend from #426 was already complete and this issue was frontend-only)
plus the TDD implementation (10 new hooks/components, their tests, and the Cypress spec) landed
inside the original 4–7h estimate. What pushed the total past pessimistic was the Codex review
loop: three `@codex review` cycles ran across roughly 45 minutes of wall-clock review time, and the
background worker handling that loop stalled for an extended stretch mid-cycle (a harness-level
"no progress" timeout, not a defect in the review itself) before resuming and finishing its work.
That loop produced three real, worthwhile fixes — a shared open-panel stack so Escape/focus-trap
only affects the topmost of two stacked `SlidePanel` instances (the standalone Template Manager
opening on top of the Product/Variant panel), permission-gating presentation/template rows as
read-only instead of offering an always-403 edit action, a template-select cache-invalidation gap,
and a focus-restoration bug when a panel swaps its content in place without closing — all outside
the scope this agent would have caught unprompted, and all fixed, tested, and merged into the final
squashed commit. The Cypress E2E spec was written following this repo's established seeding pattern
but could not be run locally (this dev-lab workspace has no E2E Docker stack up); it needs a real
run before the corresponding Acceptance Criterion is ticked.



