# 🗄️ Task #045: OvertimeBankMovement Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `OvertimeBankMovement` migration and model, to track overtime bank transactions.

**Español:**
Como desarrollador, necesito crear la migración y modelo `OvertimeBankMovement`, para registrar movimientos del banco de horas extra.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_overtime_bank_movements_table` — id, employee_id (FK), attendance_id (FK nullable), date, minutes (int), movement_type (enum: EARNED|USED|PAID|ADJUSTMENT), origin (enum: AUTO|MANUAL), valuation_method (enum nullable: LFT_PROPORTIONAL|AGREED_RATE), applied_rate (decimal nullable), amount (decimal nullable), authorized_by (FK nullable → users), authorized_at (datetime nullable), reason (text nullable), timestamps
- [ ] 🔧 Create enums: OvertimeMovementType, OvertimeOrigin, OvertimeValuationMethod
- [ ] 🔧 Create model — method balanceImpact(): EARNED=+minutes, USED/PAID=−minutes, ADJUSTMENT=±minutes (signed)
- [ ] 🏭 Create factory
- [ ] 🧪 Unit tests: balanceImpact for each type, enum restrictions

---

## 🎯 Acceptance Criteria

- [ ] balanceImpact correct for all 4 types
- [ ] Enums restrict values

---

## 🔗 References

- **Backlog:** AP-034
- RF-42, RF-44, RF-45
- domain-model.md §2.10

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
