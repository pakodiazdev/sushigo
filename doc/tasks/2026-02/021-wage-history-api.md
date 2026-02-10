# 🌐 Task #021: WageHistory API

## 📖 Story

**English:**
As an Admin, I want to register and query wage history for an employee, to track salary changes.

**Español:**
Como Admin, quiero registrar y consultar el historial de sueldo de un empleado, para tener trazabilidad de incrementos.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/employees/{id}/wages` — CreateWageController (auto-closes previous wage: effective_to = new.effective_from − 1 day)
- [ ] 🌐 `GET /api/v1/employees/{id}/wages` — ListWagesController (ordered by effective_from desc)
- [ ] 📝 StoreWageRequest — daily_wage required > 0, effective_from required
- [ ] 🧪 Feature tests: create wage, auto-close previous, list history, negative wage rejected

---

## 🎯 Acceptance Criteria

- [ ] Previous wage auto-closed on new entry
- [ ] daily_wage > 0 enforced

---

## 🔗 References

- **Backlog:** AP-006
- RF-22, RF-23
- domain-model.md §2.5

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
