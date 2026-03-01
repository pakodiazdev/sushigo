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
