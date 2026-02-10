# 🌐 Task #066: List Negotiated Extra Days API

## 📖 Story

**English:**
As a Manager, I want to query negotiated extra days for a period.

**Español:**
Como Manager, quiero consultar los días extra negociados de un periodo.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/negotiated-extra-days?employee_id=&date_from=&date_to=` — ListExtraDaysController
- [ ] 🔧 Includes: employee, date, agreed_pay, approved_by, notes
- [ ] 🧪 Feature tests: filter, pagination

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Extra Days Table** — route: `/attendance/extra-days` or tab in Employee Detail; columns: date, employee, branch, agreed_pay, approved_by, notes; date range filter; pagination
- [ ] 📱 **Register Button** — opens Register Extra Day modal (#043)
- [ ] 📱 Hook: `useExtraDays(filters)` — query with date range + employee filter
- [ ] 🧪 E2E test: list extra days, filter by date range

---

## 🎯 Acceptance Criteria

- [ ] Filters and pagination work

---

## 🔗 References

- **Backlog:** AP-033
- RF-39
- domain-model.md §2.9

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
