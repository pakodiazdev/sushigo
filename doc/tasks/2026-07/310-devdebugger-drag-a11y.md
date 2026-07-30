# 🔨 [Maintainability] Non-interactive DOM elements should not have an interactive handler (typescript:S6848)

## Description

SonarCloud flagged **4** occurrence(s) of rule `typescript:S6848` (Maintainability, MAJOR) in
`sushigo-webapp`: non-interactive DOM elements carry an interactive event handler (e.g. `onClick`)
without the semantics assistive technology needs to recognize them as interactive.

## Reason

Interactive handlers attached to non-semantic elements are invisible to keyboard and screen-reader
users, and they trip SonarCloud's maintainability gate — blocking a clean quality report for
`sushigo-webapp`. This overlaps with a related reliability finding (missing keyboard listener) on
the same elements, so both should be fixed together per file.

## Objective

Each of the 4 flagged locations either uses a semantically interactive element (`<button>`, `<a>`)
or has the correct ARIA role plus a keyboard handler, and SonarCloud no longer reports
`typescript:S6848` for these files.

## Affected locations

- `src/components/ui/confirm-dialog.tsx:139`
- `src/components/auth/BranchSwitcher.tsx:51`
- `src/components/dev/DevDebugger.tsx:158`
- `src/components/layout/Sidebar.tsx:272`

## Proposed approach

Either swap the element for a semantically interactive one (`<button>`, `<a>`) or add the missing ARIA role + keyboard handler so assistive technology recognizes it as interactive. This overlaps with the reliability finding for the same elements (missing keyboard listener) — fix both together per file.

## References

- SonarCloud project: [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S6848)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `3h` · **Tracked:** `3h43m`

### 📅 Sessions
```json
[
  { "date": "2026-07-29", "start": "20:18", "end": "00:01" }
]
```




## 📊 Retrospective
- **Actual total:** 3h 43m (223m)
- **vs optimistic:** +2h 43m
- **vs pessimistic:** +43m

**Justification:**
The initial fix applied `role="button"` + `tabIndex` + a keyboard handler to the entire drag-handle
container (icon, label, and the action buttons for refresh/minimize/expand). A follow-up review
pass caught that this made the action buttons nested interactive elements inside another
interactive element — an accessibility anti-pattern that also breaks their own click handlers from
receiving focus predictably. That required a second commit narrowing the `role`/`tabIndex`/keyboard
handler to just the icon+label title region in both drag handles (floating panel header and
minimized bubble), while keeping `dragRef` and `data-testid` on the outer container so drag-offset
calculation and existing tests kept targeting the same element. Writing and adjusting the Vitest
coverage for both the keyboard-nudge behavior and the narrowed a11y attributes accounted for the
rest of the overrun past the 3h pessimistic estimate.

