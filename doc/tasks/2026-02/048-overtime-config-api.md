# 🌐 Task #048: Overtime Pay Config API

## 📖 Story

**English:**
As an Admin, I want to configure how overtime is paid per employee (LFT or agreed rate).

**Español:**
Como Admin, quiero configurar el método de pago de horas extra por empleado (LFT o tarifa acordada).

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/employees/{id}/overtime-config` — CreateOvertimeConfigController (auto-close previous)
- [ ] 🌐 `GET /api/v1/employees/{id}/overtime-config` — GetOvertimeConfigController (current + history)
- [ ] 📝 StoreOvertimeConfigRequest — method (required), hourly_rate (required if AGREED_RATE), lft_factor (required if LFT_PROPORTIONAL), effective_from
- [ ] 🧪 Feature tests: create LFT config, create AGREED config, auto-close previous, get history

---

## 🎯 Acceptance Criteria

- [ ] Previous config auto-closed
- [ ] Method-dependent validation works

---

## 🔗 References

- **Backlog:** AP-037
- RF-47c, DC-03
- domain-model.md §2.6

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
