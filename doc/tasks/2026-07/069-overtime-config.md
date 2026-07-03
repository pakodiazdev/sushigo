# ⚙️ Task #069: Configure Overtime Payment Method per Employee

## 📖 Story

**English:**
As an Admin, I want to configure how overtime is valued for each employee (LFT proportional or agreed hourly rate), so the system can calculate the correct payment when overtime is authorized.

**Español:**
Como Admin, quiero configurar cómo se valoran las horas extra de cada empleado (proporcional LFT o tarifa acordada por hora), para que el sistema calcule el pago correcto cuando se autoricen horas extra.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_overtime_pay_configs_table` — employee_id (FK), valuation_method (enum: LFT_PROPORTIONAL|AGREED_RATE), lft_factor (decimal nullable), hourly_rate (decimal nullable), effective_from, effective_to (nullable), timestamps
- [ ] 🔧 `OvertimePayConfig` model — scope `effective(date)`, method `calculatePay(minutes, dailyWage)`: LFT = (dailyWage/8/60)×lft_factor×minutes; AGREED = (hourly_rate/60)×minutes
- [ ] 🌐 `POST /api/v1/employees/{id}/overtime-config` — on create auto-closes previous config
- [ ] 🌐 `GET /api/v1/employees/{id}/overtime-config` — current config + history
- [ ] 🧪 Unit tests: calculatePay for both methods; Feature tests: create, auto-close previous

## ✅ Frontend Tasks

- [ ] 📝 Add `OvertimePayConfig`, `OvertimeValuationMethod` types to `src/types/attendance-payroll.ts`
- [ ] 🔧 `setOvertimeConfig(employeeId, data)` + `getOvertimeConfig(employeeId)` in `src/services/overtime.service.ts`
- [ ] 📱 **Overtime config section** in Employee Detail → Configuration tab — shows current method, rate, effective date; "Configurar" button opens form
- [ ] 📱 **Config form** — method selector (LFT_PROPORTIONAL / AGREED_RATE); conditional field: lft_factor if LFT, hourly_rate if AGREED; effective_from date
- [ ] 🔧 `useOvertimeConfig(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [ ] Admin can select LFT Proportional or Agreed Rate and save the config
- [ ] When AGREED_RATE is selected, hourly_rate field is required; when LFT, lft_factor is required
- [ ] Current method is visible in the employee's Configuration tab

---

## 🔗 References

- **Backlog:** AP-035, AP-037 · RF-47c, DC-03

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `6h46m`

### 📅 Sessions
```json
[
  { "date": "2026-07-03", "start": "02:18", "end": "09:04" }
]
```
