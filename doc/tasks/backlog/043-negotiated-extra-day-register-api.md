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

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Register Extra Day Modal** — fields: employee_id (select), date (picker), branch_id (select), agreed_pay (currency), notes (text); accessible from attendance page or employee detail
- [ ] 📱 **Success Feedback** — toast + attendance view updates showing day_status=EXTRA
- [ ] 📱 Hook: `useRegisterExtraDay()` — mutation
- [ ] 🧪 E2E test: register extra day, verify attendance shows EXTRA status

### 📱 Frontend Tasks (mobile)

- [ ] 📱 **Register Extra Day** — accessible from employee card menu (⋮); bottom sheet form: date, agreed_pay, notes
- [ ] 📱 **EXTRA Badge** — employee card shows "Extra" badge when day_status=EXTRA

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
