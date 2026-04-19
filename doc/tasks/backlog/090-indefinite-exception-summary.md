# 🐛 Task #090: Indefinite Exceptions Should Affect Schedule Summary

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

- [ ] 🔧 Modify schedule summary calculation to merge indefinite exceptions into the day groups
- [ ] 🔧 Return a `resolved_days` array that reflects base schedule + indefinite exceptions
- [ ] 🧪 Unit tests for summary calculation with indefinite exceptions

## ✅ Frontend Tasks

- [ ] 📱 Update `schedule-inline-summary` component to render grouped days with different times
- [ ] 🔧 Update hook to use `resolved_days` when available
- [ ] 🧪 Frontend tests for the new summary rendering

---

## 🎯 Acceptance Criteria

- [ ] Summary line shows actual schedule considering indefinite exceptions
- [ ] Days with the same time are grouped (e.g., "L, M, J, V" not "L · M · J · V")
- [ ] Indefinite exceptions are visually distinguishable (different color or separator)
- [ ] Badge count only includes temporary exceptions, not indefinite ones
- [ ] Works in both dialog summary and employee card summary

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
