# 📤 Task #075: Export Closed Period to CSV

## 📖 Story

**English:**
As an Admin, I want to export a closed payroll period to a CSV file, so I can process it in spreadsheets or import it into other systems.

**Español:**
Como Admin, quiero exportar un periodo de nómina cerrado a un archivo CSV, para procesarlo en hojas de cálculo o importarlo en otros sistemas.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/pay-periods/{id}/export?format=csv` — ExportClosedPeriodController
- [ ] 🔧 CSV format: one row per employee — code, name, base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, holiday_pay, total_pay
- [ ] 🔧 UTF-8 BOM header for Excel compatibility; Content-Disposition: attachment
- [ ] 🧪 Feature test: correct headers, correct row count, BOM present

## ✅ Frontend Tasks

- [ ] 🔧 `exportPeriodCsv(periodId)` in `src/services/payroll.service.ts` — uses `window.open` or axios blob download
- [ ] 📱 **"Exportar CSV" button** in the Closed Period Detail (#074) — admin only
- [ ] 📱 Download triggers immediately; shows success toast "Archivo descargado"

---

## 🎯 Acceptance Criteria

- [ ] Admin clicks Export and receives a CSV file
- [ ] CSV opens correctly in Excel (BOM, headers, one row per employee)
- [ ] Button is only visible for closed (not open) periods

---

## 🔗 References

- **Backlog:** AP-062 · RF-50

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `~5h04m`

### 📅 Sessions
```json
[
  { "date": "2026-07-14", "start": "02:18", "end": "07:22" }
]
```

## 📊 Retrospective
- **Actual total:** 5h 04m (304 min)
- **vs optimistic:** +4h 04m
- **vs pessimistic:** +3h 04m

**Justification:**

The implementation itself (backend endpoint, frontend service/hook/button, tests) was quick and matched the estimate. The overrun came almost entirely from environment collisions outside the task's scope: the dev-lab's shared `mydb_test` PostgreSQL database is used by every workspace, and other workspaces (`sushigo-b`, `sushigo-e`) ran their own PHPUnit suites concurrently multiple times during this session, causing repeated deadlocks and, once, a corrupted intermediate schema that needed a manual `migrate:fresh` to recover before tests could run at all. Standing up the isolated E2E Docker stack for the mandatory Cypress spec (first-time container build) also added time. None of this reflects unplanned work on the feature itself — see the `feedback-shared-test-db-collision` memory for the underlying infra issue.
