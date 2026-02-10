# 📋 Task #034: Register Partial Leave API

## 📖 Story

**English:**
As a Manager, I want to register a partial leave (arrive late, leave early, take time) flagging it as paid or unpaid.

**Español:**
Como Manager, quiero registrar un permiso parcial indicando si es con goce o sin goce.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/partial-leaves` — RegisterPartialLeaveController
- [ ] 📝 StorePartialLeaveRequest — employee_id, date, type (enum), is_paid (bool), start_time (opt), end_time (opt), duration_minutes, reason
- [ ] 🔧 approved_by = authenticated user
- [ ] 🔧 If attendance exists for that date → link attendance_id
- [ ] 🔧 If start_time + end_time provided → auto-calculate duration_minutes
- [ ] 🧪 Feature tests: paid leave, unpaid leave, with time window (auto-duration), without attendance link

### 📱 Frontend Tasks (mobile)

- [ ] 📱 **Partial Leave Button** — accessible from employee card menu (⋮); opens form sheet
- [ ] 📱 **Partial Leave Form** — fields: type (select), is_paid (toggle), start_time (optional), end_time (optional), duration_minutes (auto or manual), reason (text)
- [ ] 📱 **Auto-duration** — when start + end time filled, auto-calculate duration; otherwise manual input
- [ ] 📱 **Success Feedback** — toast with leave summary
- [ ] 📱 Hook: `useRegisterPartialLeave()` — mutation

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Register Partial Leave Modal** — same form as mobile, accessible from Today Attendance row or Employee Detail
- [ ] 🧪 E2E test: register partial leave (paid and unpaid), verify in list

---

## 🎯 Acceptance Criteria

- [ ] approved_by auto-set
- [ ] Duration auto-calculated from time window if provided
- [ ] Links to attendance when available
- [ ] 📱 Auto-duration calculation works on both platforms
- [ ] 📱 Paid/unpaid toggle clearly differentiated

---

## 🔗 References

- **Backlog:** AP-021
- RF-25a, RN-00c
- domain-model.md §2.8, sequence §6.4

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
