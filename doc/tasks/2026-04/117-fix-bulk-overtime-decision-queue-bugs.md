# 🐛 Fix bulk overtime decision queue bugs (null crash, replace vs append, silent skip)

## 📖 Story
As a manager, I need the bulk overtime decision queue to handle errors gracefully and preserve all pending decisions, so that no overtime authorization is silently skipped when closing a day in bulk.

---

## ✅ Technical Tasks

- [x] 🔧 Make `overtime_pending` optional in `CloseDayResponse` type (`attendance.ts`) — prevents null crash when backend version doesn't return the field
- [x] 🐛 Add null guard in `use-close-day-panel.ts` — use `result.data.data.overtime_pending ?? []` before accessing `.length`
- [x] 🐛 Fix `enqueueBulkOvertime` in `use-today-attendance-page.ts` — use functional update `setBulkOvertimeQueue(queue => [...queue, ...entries])` instead of replacing
- [x] 🐛 Fix `confirmBulkOvertimeDecision` in `use-today-attendance-page.ts` — advance queue in `onSuccess` only, not `onSettled`, so failed decisions are retryable
- [x] 🧪 Add unit tests covering: null overtime_pending, queue append behavior, queue not advancing on error

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `3h`
- **Tracked:** `-`

### 📅 Sessions
```json
[]
```
