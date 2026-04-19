# ~~📋 Task #058: View Partial Leave History~~ — DEPRECATED

> **⚠️ DEPRECATED — Superseded by #078 (Employee Leaves Tab)**
>
> **Reason:** This task originally planned a standalone "Partial Leave History" panel or page. After architectural review, partial leaves are regular `Leave` records with `calculation_mode = PROPORTIONAL_HOURS`. Their history is therefore visible in the same Leaves tab built in #078, which already supports date range filtering, status badges, and pagination.
>
> **Where the functionality lives:**
> - **View leave history (all types, including partial)** → Employee Detail → "Ausencias" tab (#078)
> - Partial leaves are identifiable in the table by their `calculation_mode` badge (shows "Parcial" or similar) and by the presence of `starts_at` / `ends_at` times
>
> **Do not implement this task.** Close GitHub issue #58.

---

## 📖 Original Story (archived)

**English:**
As a Manager, I want to query an employee's partial leaves within a date range, so I can review their history and verify what has been deducted.

**Español:**
Como Manager, quiero consultar los permisos parciales de un empleado dentro de un rango de fechas, para revisar su historial y verificar qué se ha descontado.
