# 🌐 Task #065: Punctuality Configuration API

## 📖 Story

**English:**
As an Admin, I want to manage punctuality ranges, bonus groups, and exceptions via API.

**Español:**
Como Admin, quiero gestionar rangos, grupos de bono y excepciones de puntualidad vía API.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/punctuality/ranges` — list; `PUT /api/v1/punctuality/ranges` — bulk update
- [ ] 🌐 `GET /api/v1/punctuality/bonus-groups` — list; `POST /api/v1/punctuality/bonus-groups` — create
- [ ] 🌐 `POST /api/v1/employees/{id}/bonus-config` — assign group
- [ ] 🌐 `POST /api/v1/employees/{id}/punctuality-exceptions` — create exception; `GET ...` — list
- [ ] 🧪 Feature tests for each endpoint

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Punctuality Config Page** — route: `/config/punctuality`; three sections:
    1. **Ranges** — editable table (min_late, max_late, bonus_percentage); bulk save button
    2. **Bonus Groups** — list + create form (name, daily_bonus, description)
    3. **Employee Assignments** — assign group to employee (select employee, select group)
- [ ] 📱 **Punctuality Exceptions** (in Employee Detail) — list of exceptions (date, bonus_override_pct, reason); create modal
- [ ] 📱 Hooks: `usePunctualityRanges()`, `useBonusGroups()`, `useEmployeeBonusConfig()`, `usePunctualityExceptions(employeeId)`
- [ ] 🧪 E2E test: edit ranges, create bonus group, assign to employee, create exception

---

## 🎯 Acceptance Criteria

- [ ] All CRUD endpoints work
- [ ] Validation enforces rules
- [ ] 🖥️ Range table editable with inline save
- [ ] 🖥️ Bonus group creation works
- [ ] 🖥️ Exception management per employee works

---

## 🔗 References

- **Backlog:** AP-030
- RF-32, RF-33, RF-37
- domain-model.md §2.16–2.19

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `4h`
- **Pessimistic:** `6h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
