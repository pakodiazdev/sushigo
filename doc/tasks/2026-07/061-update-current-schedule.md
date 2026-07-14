# ✏️ Task #061: Update Current Schedule

## 📖 Story

**English:**
As an Admin, I want to update the times and settings of the current active schedule, so I can correct mistakes without creating a new schedule entry.

**Español:**
Como Admin, quiero actualizar los tiempos y configuración del horario activo actual, para corregir errores sin crear un nuevo registro de horario.

---

## ✅ Backend Tasks

- [x] 🌐 `PUT /api/v1/schedules/{schedule}` — UpdateScheduleController (top-level route, not nested under employment-periods)
- [x] 📝 UpdateScheduleRequest — same fields as `StoreScheduleRequest` (`workday_type`, `working_days_per_week`, `days[]`; no `name` — that column was dropped from `employee_schedules`)
- [x] 🔧 `UpdateScheduleAction` — replaces the 7 `ScheduleDay` rows in place; only allowed if `effective_to IS NULL` (schedule is currently active); 422 if closed
- [x] 🧪 Feature tests: update active schedule, reject update on closed schedule

## ✅ Frontend Tasks

- [x] 📱 **Edit button** on Current Schedule panel — opens the existing simplified shared-hours form (from `CreateScheduleForm`/`useCreateScheduleInline`) in edit mode, pre-filled
- [x] 📝 Add `scheduleApi.update(scheduleId, payload)` to `src/services/schedule-api.ts`
- [x] 🔧 Extend/reuse the create-schedule hook for edit mode — mutation calls update instead of create, on success refreshes schedule panel
- [x] 📱 No new per-day grid — reuses the shared-hours form as-is (per product decision), not a literal distinct-times-per-day grid

---

## 🎯 Acceptance Criteria

- [x] Admin can edit times on the current schedule and save
- [x] Form pre-fills with existing values
- [x] Closed schedules (in history) do not show the edit button

---

## 🔗 References

- **Backlog:** AP-011 · RF-08

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `5h 07m`

### 📅 Sessions
```json
[
  { "date": "2026-07-13", "start": "10:20", "end": "13:54" },
  { "date": "2026-07-13", "start": "20:15", "end": "21:48" }
]
```

## 📊 Retrospective
- **Actual total:** 5h 07m (214 min + 93 min)
- **vs optimistic:** +4h 07m
- **vs pessimistic:** +3h 07m

**Justification:**

The original estimate (1–2h) covered only the scope in the task description: the update endpoint plus an edit button reusing the existing form. That part landed close to estimate. The overrun came from three activities outside the original scope:

1. **Numbering cleanup** — the local task file and a prior PR (#119) had been mislabeled `#061` for unrelated, already-shipped work. Untangling that (renaming the stale file, confirming against GitHub issue history) added time before implementation even started.
2. **Full review cycle** — a Copilot PR review flagged a real boolean-coercion bug, and two SonarCloud passes (`api` and `webapp`) surfaced a 45% code duplication issue and 3 code smells (including a cognitive-complexity refactor of `ScheduleDialog`). All were legitimate, not false positives, so all were fixed rather than suppressed.
3. **A genuine data-integrity bug found in manual review** — editing `effective_from` on the active schedule could silently create timeline gaps or overlaps with the previous closed schedule (no automated tool flagged this; it came from a manual code-analysis request). Fixing it required mirroring `CreateScheduleAction`'s auto-close behavior in `UpdateScheduleAction` plus a new validation rule, with 4 additional tests.

None of these were rework of the initial implementation — each was a distinct, additive correctness fix discovered through the review pipeline (Copilot, SonarCloud, and manual review) rather than a flaw in the original design.
