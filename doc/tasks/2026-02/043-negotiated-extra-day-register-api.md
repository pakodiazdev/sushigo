# 🌐 Task #043: Register Negotiated Extra Day API

## 📖 Story

**English:**
As a Manager, I want to register a negotiated extra day for an employee, documenting the agreed pay.

**Español:**
Como Manager, quiero registrar un día extra negociado para un empleado, documentando el pago acordado.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/negotiated-extra-days` — RegisterExtraDayController
- [ ] 📝 StoreExtraDayRequest — employee_id, date, branch_id, agreed_pay (> 0), notes
- [ ] 🔧 approved_by = authenticated user
- [ ] 🔧 Creates/updates Attendance for that date with day_status = EXTRA
- [ ] 🔧 Return 422 if extra already exists for employee/date
- [ ] 🧪 Feature tests: register extra day, attendance auto-created with EXTRA status, duplicate (422)

---

## 🎯 Acceptance Criteria

- [ ] Attendance created with EXTRA status
- [ ] approved_by auto-set
- [ ] Duplicate rejected

---

## 🔗 References

- **Backlog:** AP-032
- RF-38, RF-39, RN-09
- domain-model.md §2.9

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
