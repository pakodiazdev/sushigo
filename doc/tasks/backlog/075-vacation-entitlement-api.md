# 🌐 Task #075: Vacation Entitlement API

## 📖 Story

**English:**
As an Admin, I want to register annual vacation entitlements per LFT.

**Español:**
Como Admin, quiero registrar el derecho vacacional anual conforme LFT.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/employees/{id}/vacation-entitlements` — CreateEntitlementController
- [ ] 🌐 `GET /api/v1/employees/{id}/vacation-entitlements` — ListEntitlementsController (with remaining)
- [ ] 🔧 Return 422 if year already exists
- [ ] 🧪 Feature tests

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Vacation Tab** (in Employee Detail) — table per year: year, entitled_days, taken_days, remaining_days (calculated), status bar (visual)
- [ ] 📱 **Register Entitlement Modal** — fields: year (number, default current), entitled_days (based on LFT seniority); validation: duplicate year rejected
- [ ] 📱 **Remaining Days Indicator** — progress bar or fraction display (taken/entitled)
- [ ] 📱 Hooks: `useVacationEntitlements(employeeId)`, `useCreateEntitlement()`
- [ ] 🧪 E2E test: register entitlement, verify remaining calculation

---

## 🎯 Acceptance Criteria

- [ ] Duplicate year rejected
- [ ] Remaining days calculated
- [ ] 🖥️ Entitlement table renders per year
- [ ] 🖥️ Remaining days indicator accurate

---

## 🔗 References

- **Backlog:** AP-053
- RF-26
- domain-model.md §2.14

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
