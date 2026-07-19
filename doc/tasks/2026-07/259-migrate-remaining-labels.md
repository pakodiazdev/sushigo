# 🔨 Task #259: Migrate Remaining Color-less Form Labels to Label Component

**GitHub Issue:** [#259](https://github.com/pakodiazdev/sushigo/issues/259)

## 📖 Story

**English:**
As a frontend developer, I need the remaining form `<label>` elements that have no explicit text color migrated to the centralized `Label` component (introduced in #248), so they don't silently lose contrast the next time one of them ends up inside a native `<dialog>` or any other ancestor that sets its own `color`.

**Español:**
Como desarrollador frontend, necesito que los `<label>` restantes sin color de texto explícito se migren al componente centralizado `Label` (introducido en #248), para que no pierdan contraste en silencio la próxima vez que alguno termine dentro de un `<dialog>` nativo o cualquier otro ancestro que fije su propio `color`.

---

## 🧠 Context

Issue #248 created the centralized `Label` component and migrated `OvertimeDecisionDialog.tsx` as the reference example, deliberately scoping out the rest of the codebase. A full repo scan (`grep -rn "<label" src`) found 89 `<label>` usages total. Of those, 21 across 10 files have no explicit text color at all — the exact same bug class fixed in #248, currently only "working" because none of them happen to sit inside a native `<dialog>` yet.

This issue covers only that highest-risk subset. Two other groups were found and are explicitly out of scope here:
- Labels that already set `text-foreground`/`text-muted-foreground` (lower urgency, consistency-only)
- Labels with hardcoded `text-gray-700` in `payroll/index.tsx` and `payroll/close.tsx` (a different bug — doesn't use the theme token at all — worth its own issue)
- Structural labels wrapping checkbox/radio "pill" option cards (`flex items-center gap-*` layouts) — `Label`'s plain-text styling doesn't fit these as-is

**Depends on #248** — this branch is stacked on `refactor/248-centralize-label-component` since `Label` doesn't exist on `main` yet.

---

## ✅ Technical Tasks

- [ ] 🔁 Migrate the following color-less `<label>` usages to `<Label>`:
  - `src/components/employees/rehire-form.tsx:39`
  - `src/components/employees/deactivate-form.tsx:37,51`
  - `src/components/employees/bonus-config-section.tsx:84,104`
  - `src/components/employees/register-wage-form.tsx:67,88,109,140,168,202,220`
  - `src/components/employees/override-scope-dialog.tsx:100,109`
  - `src/components/employees/vacation-policy-override.tsx:25`
  - `src/pages/login.tsx:54,71`
  - `src/pages/forgot-password.tsx:106`
  - `src/pages/reset-password.tsx:206,223`
  - `src/pages/attendance/config/holidays.tsx:340`
- [ ] 📝 Update `doc/conventions/frontend/label-styles.md` to move these files from the "follow-up candidates" list into the migrated set

---

## 🎯 Acceptance Criteria

- [ ] All 21 listed `<label>` usages render via the centralized `Label` component instead of hand-written `className="text-sm font-medium"` (or equivalent color-less variants)
- [ ] No visual regression — labels keep their existing layout classes (`block`, `flex items-center gap-1`, etc.) via `className` passthrough
- [ ] Existing Vitest/Cypress suites for the touched forms still pass

---

## 🔗 References

- Follow-up to #248 (centralized `Label` component + reference migration)

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `36m`

### 📅 Sessions
```json
[
  { "date": "2026-07-19", "start": "13:36", "end": "14:09" },
  { "date": "2026-07-19", "start": "15:07", "end": "15:10" }
]
```

---

## 📊 Retrospective
- **Actual total:** 36m (33 min + 3 min)
- **vs optimistic:** −1h 24m
- **vs pessimistic:** −3h 24m

**Justification:**

The 17 call sites and their exact file:line locations had already been identified by the repo-wide scan done before this issue was created, so this was a mechanical migration with no discovery work — just applying the already-proven `Label` component pattern from #248 to each site and verifying no regressions (typecheck, lint, existing Vitest suites). The short second session (3 min) was branch maintenance after #248 merged: rebasing onto the updated `main`, retargeting the PR base, and deleting the now-stale intermediate branch — not part of the original technical scope but necessary to leave the PR mergeable.
