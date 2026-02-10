# 🗄️ Task #042: NegotiatedExtraDay Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `NegotiatedExtraDay` migration and model, to record extra days with agreed pay.

**Español:**
Como desarrollador, necesito crear la migración y modelo `NegotiatedExtraDay`, para registrar días extra negociados.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_negotiated_extra_days_table` — id, employee_id (FK), date, branch_id (FK), agreed_pay (decimal 10,2), approved_by (FK → users), notes (text nullable), timestamps. UNIQUE(employee_id, date)
- [ ] 🔧 Create `NegotiatedExtraDay` model — belongsTo(Employee), belongsTo(Branch), validation: agreed_pay > 0
- [ ] 🏭 Create factory
- [ ] 🧪 Unit test: create, unique constraint, agreed_pay positive

---

## 🎯 Acceptance Criteria

- [ ] UNIQUE(employee_id, date)
- [ ] agreed_pay > 0

---

## 🔗 References

- **Backlog:** AP-031
- RF-38, RF-39
- domain-model.md §2.9

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
