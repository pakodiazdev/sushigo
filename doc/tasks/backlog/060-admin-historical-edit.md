# 🔐 Task #060: Admin Historical Edit with Reason

## 📖 Story

**English:**
As an Admin, I want to edit past attendance records providing a justification, for audited corrections.

**Español:**
Como Admin, quiero editar registros de asistencia pasados proporcionando justificación, para correcciones auditadas.

---

## ✅ Technical Tasks

- [ ] 🔧 For past-date edits (date < today), require `reason` field in request body
- [ ] 🔧 Audit log stores the reason provided
- [ ] 🔧 Return 422 if Admin edits past date without reason
- [ ] 🧪 Feature tests: Admin edits yesterday with reason (OK + audit), Admin without reason (422)

---

## 🎯 Acceptance Criteria

- [ ] Reason required for historical edits
- [ ] Audit log records reason

---

## 🔗 References

- **Backlog:** AP-067
- RF-18, RF-19
- backlog AP-067

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
