# 🔨 Task #315: Functions should not be nested too deeply (typescript:S2004)

## 📖 Story

**English:**
As a developer, I need the role-toggle handler in the employee form to be flattened, so that SonarCloud's maintainability gate stays clean and the logic is easier to read and test in isolation.

**Español:**
Como desarrollador, necesito que el handler de toggle de puestos en el formulario de empleado se aplane, para que el gate de mantenibilidad de SonarCloud se mantenga limpio y la lógica sea más fácil de leer y probar de forma aislada.

---

## 🔍 SonarCloud Finding

| Rule | Category | Severity | File | Line |
|---|---|---|---|---|
| `typescript:S2004` | Maintainability | CRITICAL | `src/components/employees/employee-edit-create-form.tsx` | 293 |
| `typescript:S2301` | Maintainability | MAJOR | `src/components/employees/employee-edit-create-form.tsx` | 78 |

**Message (S2004):** Functions should not be nested too deeply.

The nesting chain: component function → `Controller` render prop arrow → `assignableRoles.map()` arrow → `ToggleSwitch onChange` arrow → inline `current.filter(...)` arrow — 5 levels deep.

**Message (S2301):** Methods should not contain selector parameters. The first fix (a single `toggleRoleSelection(currentRoles, role, checked)` function using `checked` as a boolean selector) resolved S2004 but was itself flagged by the PR's SonarCloud quality gate scan — surfaced via `/sonar-review`, before merge.

## ✅ Technical Tasks

- [x] 🔨 Extract the inline `checked ? [...current, role] : current.filter(...)` out of the `ToggleSwitch onChange` handler to flatten its nesting (S2004)
- [x] 🔨 Split the extraction into two module-level functions, `addRole(currentRoles, role)` and `removeRole(currentRoles, role)`, with the `checked` ternary moved to the call site (S2301 — avoids a boolean selector parameter)
- [x] ✅ Add a Vitest test exercising the role-toggle interaction (check/uncheck updates submitted `roles`)
- [x] 🔍 Confirm no other test depends on the old inline structure — full webapp suite (242 files / 3531 tests) passes unmodified

## 🎯 Acceptance Criteria

- [x] `employee-edit-create-form.tsx:293` (S2004) and `:78` (S2301) no longer trigger their respective rules — PR #344 quality gate: OK
- [x] No visual/behavioral regression — toggling a role still adds/removes it correctly
- [x] Existing tests pass unmodified; new test covers the toggle behavior directly
- [x] Lint + typecheck clean

## 🚫 Explicitly Out of Scope

- No other SonarCloud findings in this file are addressed beyond the S2004 finding this issue reports and the S2301 finding it introduced as a direct side effect of fixing S2004

---

## 🔗 References

- SonarCloud project: https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S2004
- GitHub Issue: [#315](https://github.com/pakodiazdev/sushigo/issues/315)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1h` · **Tracked:** `15m`

### 📅 Sessions
```json
[
  { "date": "2026-07-27", "start": "20:23", "end": "20:38" }
]
```

## 📊 Retrospective
- **Actual total:** 15m (15m tracked in Sessions above)
- **vs optimistic:** −15m
- **vs pessimistic:** −45m

**Justification:**

Single, well-scoped mechanical extraction: the fix (pull the nested toggle logic into a module-level pure function) was exactly the pattern SonarCloud's own suggestion described. No ambiguity in approach, no existing coverage to reconcile — just added a direct test for the interaction and confirmed the full suite (242 files / 3531 tests) still passes.

**Follow-up (not separately session-tracked):** the PR-level SonarCloud gate check (`/sonar-review`, run against PR #344 before merge) caught a second finding — `typescript:S2301` — introduced by the S2004 fix itself: `toggleRoleSelection`'s `checked` boolean was a selector parameter. Split into `addRole`/`removeRole` with the ternary moved to the call site, verified via the same test + full suite + CI + SonarCloud re-scan, all green. This follow-up ran under `/sonar-review`, which doesn't open a task-file session, so its time isn't reflected in the `Tracked` figure above.
