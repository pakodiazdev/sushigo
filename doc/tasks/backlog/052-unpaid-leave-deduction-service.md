# ⚙️ Task #052: Unpaid Leave Deduction Service

## 📖 Story

**English:**
As the system, I need to calculate total deductions from unpaid partial leaves for a period.

**Español:**
Como sistema, necesito calcular el total de deducciones por permisos sin goce del periodo.

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PayrollCalculator::calculateUnpaidLeaveDeductions(partialLeaves, minuteRate)`: decimal
- [ ] 🔧 Filter where is_paid = false → sum(duration_minutes × minuteRate)
- [ ] 🔧 Paid leaves → $0
- [ ] 🧪 Tests: no leaves, 1 unpaid (45min × $2.08 = $93.60), 1 paid (0), mixed

---

## 🎯 Acceptance Criteria

- [ ] Only unpaid counted
- [ ] Minute-by-minute precision

---

## 🔗 References

- **Backlog:** AP-043
- RF-25b, RN-00d
- domain-model.md §4.3

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
