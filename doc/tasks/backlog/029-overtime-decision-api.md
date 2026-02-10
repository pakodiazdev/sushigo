# ⚡ Task #029: Authorize/Reject Overtime Payment API

## 📖 Story

**English:**
As a Manager, I want to decide whether overtime hours are paid, to control payroll expenses.

**Español:**
Como Manager, quiero decidir si las horas extra de un día se pagan o no, para controlar el gasto de nómina.

---

## ✅ Technical Tasks

- [ ] 🌐 `PATCH /api/v1/attendances/{id}/overtime-decision` — OvertimeDecisionController
- [ ] 📝 OvertimeDecisionRequest — authorize (required, boolean)
- [ ] 🔧 If authorize=true: set overtime_authorized=true, overtime_authorized_by=auth user, overtime_authorized_at=now
- [ ] 🔧 If authorize=false: set overtime_authorized=false
- [ ] 🔧 Return 422 if overtime_minutes = 0 (no overtime to decide on)
- [ ] 🔧 Return 422 if decision already made
- [ ] 🧪 Feature tests: authorize, reject, no overtime (422), already decided (422)

### 📱 Frontend Tasks (mobile)

- [ ] 📱 **Overtime Decision Screen/Modal** — shows employee name, overtime minutes, two action buttons: "Autorizar" / "Rechazar"
- [ ] 📱 **Authorization Feedback** — success toast with overtime minutes authorized; card updates with overtime badge
- [ ] 📱 **Rejection Feedback** — success toast; overtime_minutes remain but marked as not authorized
- [ ] 📱 **Pending Overtime Indicator** — on today attendance screen, highlight employees with pending overtime decisions
- [ ] 📱 Hooks: `useAuthorizeOvertime()`, `useRejectOvertime()` — mutations
- [ ] 🧪 Test: authorize overtime, verify badge; reject overtime, verify state

---

## 🎯 Acceptance Criteria

- [ ] Authorization records who and when
- [ ] Cannot decide if no overtime exists

---

## 🔗 References

- **Backlog:** AP-016
- RF-47a, DC-01
- domain-model.md §2.7

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `2h`
- **Pessimistic:** `3h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
