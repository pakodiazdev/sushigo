# 🌐 Task #068: Manual Overtime Bank Movement API

## 📖 Story

**English:**
As an Admin, I want to register manual USED or ADJUSTMENT movements in the overtime bank.

**Español:**
Como Admin, quiero registrar movimientos manuales (USED o ADJUSTMENT) en el banco.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/employees/{id}/overtime-bank/movements` — CreateManualMovementController
- [ ] 📝 StoreMovementRequest — date, minutes, movement_type (USED|ADJUSTMENT), reason (required)
- [ ] 🔧 origin = MANUAL, authorized_by = auth user
- [ ] 🔧 If USED: validate balance − minutes >= 0
- [ ] 🧪 Feature tests: USED, ADJUSTMENT, insufficient balance (422)

---

## 🎯 Acceptance Criteria

- [ ] Manual movements created
- [ ] Balance cannot go negative for USED

---

## 🔗 References

- **Backlog:** AP-039
- RF-43, RF-44
- domain-model.md §2.10

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `3h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
