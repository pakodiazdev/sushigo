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
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `~10h19m`

### 📅 Sessions
```json
[
  { "date": "2026-07-14", "start": "02:18", "end": "07:22" },
  { "date": "2026-07-14", "start": "20:45", "end": "23:45" },
  { "date": "2026-07-15", "start": "15:55", "end": "18:10" }
]
```

## 📊 Retrospective
- **Actual total:** 10h 19m (304 min + 180 min + 135 min)
- **vs optimistic:** +9h 19m
- **vs pessimistic:** +8h 19m

**Justification:**

Session 1 (5h04m) was the original implementation — see prior note: the overrun there came almost entirely from shared `mydb_test` collisions with other workspaces and standing up the E2E Docker stack for the first time, not from the feature itself. See `feedback-shared-test-db-collision` memory.

Sessions 2 and 3 (+5h15m combined) were **not** rework on the original scope — they were review follow-up and scope additions layered on afterward:
- Fixed two Devin-reported code review bugs (inline FQCN import, a premature `canExport` flag before period data loads).
- Added a new, unplanned deliverable: `PayPeriodHistorySeeder` (Development) and `PayrollPeriodHistorySeeder` (Testing) backfilling ~1 year / ~2 months of realistic weekly pay-period history, reusing the real close-period computation — plus its own Cypress E2E spec (`payroll-period-history.cy.ts`). This alone required a research sub-agent pass over the seeder conventions and payroll domain, and included recovering from an environment mistake (accidentally truncating the workspace's local dev DB via `test:reset` reading the wrong `.env`, fixed with `migrate:fresh --seed`).
- A second Devin review pass flagged that `REOPENED` periods were exportable — a genuine product-decision gap, resolved by restricting export to `CLOSED` only on both backend and frontend, with new/updated tests.
- A full `/sonar-review` cycle: the added seeder code introduced a 30-line duplication with `ConfirmCloseController` and a too-many-parameters smell, both fixed by extracting a shared `ClosePayPeriodForEmployeeAction`; a minor webapp code smell was also fixed. Required two CI round-trips to confirm the gate went green.
- Finished with a `rebase-main` and a full history squash (11 commits → 1) at explicit request.

None of this reflects estimation error on the original 1–2h scope — the estimate was for "add a CSV export endpoint + button," and roughly 90% of the tracked time across sessions 2–3 was additional scope (history backfill feature, review remediation, quality-gate compliance) requested or discovered after the original feature was already done.
