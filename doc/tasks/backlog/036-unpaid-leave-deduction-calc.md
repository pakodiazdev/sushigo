# 🔢 Task #036: Unpaid Leave Deduction Calculation

## 📖 Story

**English:**
As the system, I need unpaid partial leaves to calculate their exact minute-by-minute deduction.

**Español:**
Como sistema, necesito que los permisos sin goce calculen su deducción exacta minuto a minuto.

---

## ✅ Technical Tasks

- [ ] 🔧 Add method `PartialLeave::deductionAmount(minuteRate): decimal` — if is_paid=false → duration_minutes × minuteRate; if is_paid=true → 0
- [ ] 🔧 Add helper methods: isPaid(), isUnpaid()
- [ ] 🧪 Unit test: unpaid 45 min at $2.08/min = $93.60; paid 45 min = $0.00; boundary: 1 min deduction

---

## 🎯 Acceptance Criteria

- [ ] Unpaid = exact deduction
- [ ] Paid = zero deduction

---

## 🔗 References

- **Backlog:** AP-023
- RF-25b, RN-00d
- domain-model.md §2.8

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
