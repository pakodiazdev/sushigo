# 🗄️ Task #074: VacationEntitlement & VacationRequest Migrations & Models

## 📖 Story

**English:**
As a developer, I need to create vacation models to manage entitlements and requests.

**Español:**
Como desarrollador, necesito crear los modelos de vacaciones para gestionar derechos y solicitudes.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_vacation_entitlements_table` — id, employee_id (FK), year, entitled_days (decimal 5,2), used_days (decimal 5,2 default 0), timestamps. UNIQUE(employee_id, year)
- [ ] 📂 Create migration `create_vacation_requests_table` — id, employee_id (FK), start_date, end_date, days_count (decimal 5,2), status (enum), approved_by (FK nullable), approved_at (nullable), notes, timestamps
- [ ] 🔧 Models with remainingDays() computed, scopes
- [ ] 🧪 Unit tests

---

## 🎯 Acceptance Criteria

- [ ] Unique(employee, year)
- [ ] remainingDays computed

---

## 🔗 References

- **Backlog:** AP-052
- RF-26, RF-27
- domain-model.md §2.14, §2.15

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1.5h`
- **Pessimistic:** `2.5h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
