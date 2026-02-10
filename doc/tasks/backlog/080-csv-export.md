# 📤 Task #080: Export Pay Period to CSV

## 📖 Story

**English:**
As an Admin, I want to export a closed pay period to CSV.

**Español:**
Como Admin, quiero exportar un periodo cerrado a CSV.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/pay-periods/{id}/export?format=csv` — ExportPayPeriodController
- [ ] 🔧 One row per employee: code, name, base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, holiday_pay, total_pay
- [ ] 🔧 UTF-8 BOM header for Excel compatibility
- [ ] 🧪 Feature test: download CSV, verify headers and row count

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Export CSV Button** — on Closed Period Detail page; triggers file download; shows loading spinner during generation
- [ ] 📱 **Filename Display** — toast with filename on success
- [ ] 📱 Hook: `useExportCSV(periodId)` — mutation that handles blob download

---

## 🎯 Acceptance Criteria

- [ ] CSV downloads with correct data
- [ ] Excel-compatible encoding

---

## 🔗 References

- **Backlog:** AP-062
- RF-50
- backlog AP-062

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
