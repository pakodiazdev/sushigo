# ⚙️ Task #047: Auto-generate Overtime Bank Movement on Check-out

## 📖 Story

**English:**
As the system, I need to auto-generate an EARNED movement when check-out has overtime, and a PAID movement when authorized.

**Español:**
Como sistema, necesito generar automáticamente un movimiento EARNED al registrar check-out con overtime, y PAID cuando se autorice.

---

## ✅ Technical Tasks

- [ ] 🔧 Extend check-out logic (AP-015): if overtime_minutes > 0 → create OvertimeBankMovement type=EARNED, origin=AUTO, attendance_id linked
- [ ] 🔧 Extend overtime decision logic (AP-016): if authorize=true → create OvertimeBankMovement type=PAID with valuation_method, applied_rate, amount from OvertimePayConfig
- [ ] 🔧 If authorize=false → EARNED remains as historical only
- [ ] 🧪 Tests: checkout with overtime → EARNED created; authorize → PAID created with correct calculation; reject → only EARNED exists

---

## 🎯 Acceptance Criteria

- [ ] EARNED auto-created on check-out
- [ ] PAID created with full valuation data when authorized

---

## 🔗 References

- **Backlog:** AP-036
- RF-42, RF-43, RF-47a, RF-47b
- domain-model.md §2.10, sequence §6.2

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h`
- **Pessimistic:** `5h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
