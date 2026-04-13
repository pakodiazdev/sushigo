# ~~🕐 Task #057: Register Partial Leave~~ — DEPRECATED

> **⚠️ DEPRECATED — Superseded by #096 (Leave Request) and #077 (Leave Foundation)**
>
> **Reason:** This task originally planned a separate `partial_leaves` table with its own model and endpoints. After architectural review, partial leaves are handled by the existing `leaves` table (created in #077) using `calculation_mode = PROPORTIONAL_HOURS` and `time_mode = SCHEDULED`. No new table or model is needed.
>
> **Where the functionality lives:**
> - **Register a partial leave** → `POST /api/v1/leaves` (from #077) with `calculation_mode = PROPORTIONAL_HOURS`, `time_mode = SCHEDULED`, `starts_at`, `ends_at`
> - **Express same-day partial leave** → same endpoint, `status = APPROVED` directly (manager approves inline)
> - **Anticipated partial leave** → same endpoint with `submit_as_request = true` (see #096 for approve/reject flow)
> - **Today view context** → #098 surfaces the approved leave on the employee card
>
> **Do not implement this task.** Close GitHub issue #57.

---

## 📖 Original Story (archived)

**English:**
As a Manager, I want to register a partial leave event for an employee (arrive late by permission, leave early, or take time off during the shift), specifying whether it is paid or unpaid, so the system has the evidence to apply deductions at close time.

**Español:**
Como Manager, quiero registrar un permiso parcial para un empleado (llegó tarde con permiso, salió temprano, o tomó tiempo durante el turno), indicando si es pagado o no, para que el sistema tenga la evidencia y aplique deducciones en el cierre.
