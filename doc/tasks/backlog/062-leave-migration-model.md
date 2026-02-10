# 🗄️ Task #062: Leave Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `Leave` migration and model for full-day leave requests.

**Español:**
Como desarrollador, necesito crear la migración y modelo `Leave` para permisos de día completo.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_leaves_table` — id, employee_id (FK), leave_type_id (FK), start_date, end_date, status (enum: PENDING|APPROVED|REJECTED|CANCELLED), approved_by (FK nullable), approved_at (nullable), notes, timestamps
- [ ] 🔧 Create model — scopes: pending(), approved(); relationships
- [ ] 🏭 Factory
- [ ] 🧪 Unit tests

---

## 🎯 Acceptance Criteria

- [ ] Status enum works
- [ ] Scopes filter correctly

---

## 🔗 References

- **Backlog:** AP-049
- RF-25
- domain-model.md §2.12

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `1.5h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
