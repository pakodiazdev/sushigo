# 266 - Fix SonarCloud new-code issues in sushigo-webapp: missing button type attribute

**Type:** 🐛 Bug fix / Quality gate
**Priority:** Medium
**Detected by:** SonarCloud New Code analysis (rule `typescript:S9011`)

---

## 📋 Description

SonarCloud's [New Code summary for sushigo-webapp](https://sonarcloud.io/summary/new_code?id=pakodiazdev_sushigo-webapp) reports 13 new Code Smells (rule `typescript:S9011`), all with the message *"Add an explicit "type" attribute to this button."* No new bugs, vulnerabilities, or security hotspots are reported; new coverage (90.8%) and duplication (0%) are already passing.

Without an explicit `type="button"`, these buttons default to `type="submit"`, which can trigger unintended form submissions when they're nested inside a `<form>`.

---

## 🔍 Affected files/lines

- `src/components/employees/schedule-dialog.tsx` — lines 169, 180
- `src/components/dev/DevDebugger.tsx` — lines 100, 132, 142, 207, 214
- `src/components/devtools/ClockDebugPanel.tsx` — lines 80, 130, 156, 169, 177
- `src/pages/attendance/payroll/close.tsx` — line 76

---

## 🎯 Acceptance Criteria

- [x] All 13 flagged buttons have an explicit `type="button"` (or `type="submit"` if genuinely intended to submit a form)
- [ ] SonarCloud New Code shows 0 new issues for sushigo-webapp (pending CI analysis on PR)
- [x] `npm run lint` and `npm run typecheck` pass

---

## 🔗 References

- GitHub issue: [#266](https://github.com/pakodiazdev/sushigo/issues/266)

---

## ⏱️ Estimates

- **Optimistic:** `0.5h` · **Pessimistic:** `1h`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1h` · **Tracked:** `13m`

### 📅 Sessions
```json
[
  { "date": "2026-07-21", "start": "14:19", "end": "14:22" },
  { "date": "2026-07-21", "start": "14:22", "end": "14:32" }
]
```

## 📊 Retrospective
- **Actual total:** 13m (3m + 10m)
- **vs optimistic:** −17m
- **vs pessimistic:** −47m

**Justification:**

The fix was fully mechanical — adding `type="button"` to 13 already-identified buttons with no behavior change — so the first session finished well under the optimistic estimate with no surprises. The second session addressed two open review threads on PR #269 (Copilot): an icon-only close button missing an accessible name, and this task file's Tracked time/retrospective not matching the session convention. Both were small, well-scoped fixes, so the task still landed well under the pessimistic estimate overall.
