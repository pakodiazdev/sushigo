# 📤 Task #082: Export Pay Period to PDF

## 📖 Story

**English:**
As an Admin, I want to export a closed pay period to PDF with full breakdown.

**Español:**
Como Admin, quiero exportar un periodo cerrado a PDF con desglose completo.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/pay-periods/{id}/export?format=pdf` — ExportPayPeriodController (extend)
- [ ] 🔧 Install dompdf (or similar) via composer
- [ ] 🔧 PDF includes: header (branch, period, close date), summary table per employee, daily evidence table per employee
- [ ] 🔧 Blade template for PDF layout
- [ ] 🧪 Feature test: download PDF, verify content-type

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Export PDF Button** — on Closed Period Detail page (next to CSV button); triggers file download; loading spinner
- [ ] 📱 **Print Button** — alternative: open PDF in new tab for browser print
- [ ] 📱 Hook: `useExportPDF(periodId)` — mutation that handles blob download or opens new tab

---

## 🎯 Acceptance Criteria

- [ ] PDF downloads
- [ ] Layout includes summary + daily evidence

---

## 🔗 References

- **Backlog:** AP-063
- RF-50
- backlog AP-063

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `4h`
- **Pessimistic:** `8h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
