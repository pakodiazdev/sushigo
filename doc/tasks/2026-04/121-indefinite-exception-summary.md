# 🐛 Task #121: Indefinite Exceptions Should Affect Schedule Summary

**GitHub Issue:** [#121](https://github.com/pakodiazdev/sushigo/issues/121)

## 📖 Story

**English:**
As an Admin, I want the schedule summary line to reflect indefinite exceptions ("from here onwards"), so that I can see the actual current schedule at a glance without expanding the details.

**Español:**
Como Admin, quiero que la línea de resumen del horario refleje las excepciones indefinidas ("de aquí en adelante"), para poder ver el horario actual real de un vistazo sin expandir los detalles.

---

## 🧠 Context

When an indefinite exception is added to a schedule (e.g., "every Wednesday from April 20, 2026 onwards, work 2:00 PM - 11:00 PM"), this effectively becomes part of the permanent schedule. However, the current summary line only shows the base schedule configuration and ignores these modifications.

**Current behavior:**
- Base schedule: L-S · 1:00 PM – 10:00 PM
- Indefinite exception added: Wednesday → 2:00 PM – 11:00 PM
- Summary shows: `L-S · 1:00 PM – 10:00 PM` ❌

**Expected behavior:**
- Summary should show: `L, M, J, V, S · 1:00 PM – 10:00 PM · Mi · 2:00 PM – 11:00 PM` ✅
- Or a condensed version that indicates Wednesday has different hours

---

## 🎨 UI Design

The schedule summary line should:

1. **Group days by common time ranges** - Days with the same schedule should be grouped together
2. **Show exceptions separately** - Indefinite exceptions should appear as additional groups

### Examples

**Single exception:**
```
🕐 L, M, J, V, S · 1:00 PM – 10:00 PM · Mi · 2:00 PM – 11:00 PM · 🍽 30min · 🏠 Dom
```

**Multiple exceptions:**
```
🕐 L, M, V, S · 1:00 PM – 10:00 PM · Mi · 2:00 PM – 11:00 PM · J · Descanso · 🍽 30min · 🏠 Dom
```

**Alternative compact format (if line is too long):**
```
🕐 L-S · 1:00 PM – 10:00 PM · ⚡ 2 mod · 🍽 30min · 🏠 Dom
```

### Badge behavior

The `⚡ +N` badge at the end of the summary should only count **temporary** exceptions (those with both start AND end dates). Indefinite exceptions are "absorbed" into the summary display.

---

## ✅ Backend Tasks

> **Decision:** The merging logic was implemented entirely on the frontend (`resolveScheduleDays` in `schedule-section-utils.ts`). A backend `resolved_days` field is not needed — the API already returns `active_overrides` and the frontend merges them at render time.

- [x] 🔧 Modify schedule summary calculation to merge indefinite exceptions into the day groups (`resolveScheduleDays` + `buildWorkText` in `schedule-section-utils.ts`)
- [x] ~~🔧 Return a `resolved_days` array that reflects base schedule + indefinite exceptions~~ — not needed, done client-side
- [x] 🧪 Unit tests for summary calculation with indefinite exceptions (6 new Vitest cases in `schedule-summary.test.ts`)

## ✅ Frontend Tasks

- [x] 📱 Updated `ScheduleSummary`, `ScheduleCompactSummary`, `ScheduleHistoryItem` to pass overrides to utility functions
- [x] 🔧 `buildSummaryLines` and `buildCompactSummaryLine` now accept overrides and apply indefinite ones via `resolveScheduleDays`
- [x] 🧪 6 new Vitest cases covering grouping, day-off override, future override guard, and temporary-only path

---

## 🎯 Acceptance Criteria

- [x] Summary line shows actual schedule considering indefinite exceptions
- [x] Days with the same time are grouped (e.g., "L, M, J, V, S · 1:00 PM – 10:00 PM · X · 2:00 PM – 11:00 PM")
- [x] Indefinite exceptions are visually distinguishable — shown as a separate day group with different times in the same line (separator `·`)
- [x] Badge count only includes temporary exceptions, not indefinite ones (`effective_to !== null` filter in `ScheduleCompactSummary`)
- [x] Works in both dialog summary and employee card summary (`ScheduleSummary` + `ScheduleCompactSummary` both updated)
- [x] E2E Cypress spec: `schedule-indefinite-summary.cy.ts` (seeder group `schedule-summary`)

---

## 🔗 References

- **Story:** AP-010 · RF-09
- **Discovered in:** #062 (schedule-history)
- **Related to:** #088 (day override exceptions)

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`

---

## ⏱️ Sessions
```json
[]
```
