# Attendance & Payroll — Docs (SushiGo)

## Included files
- `attendance-payroll-spec.es.md` — Module spec (Spanish)
- `attendance-payroll-spec.en.md` — Module spec (English)
- `mvp-scope-attendance-payroll.es.md` — MVP scope (Spanish)
- `mvp-scope-attendance-payroll.en.md` — MVP scope (English)
- `domain-model.md` — **Domain model (frozen contract)**: ER diagrams, field dictionaries, UML class/state/sequence diagrams
- `backlog.md` — **Product backlog (Scrum)**: 68 user stories, 13 epics, sprint planning, RF traceability matrix

## Key rules covered
- **Partial leave / permissions** must be recorded (arrive late, leave early, take time).
- Each permission is **paid** or **unpaid**:
  - unpaid → exact minute-by-minute deduction
  - paid → record only (no payroll impact)
- Punctuality bonus is based on **minutes late** against the employee’s **expected schedule time** (not a fixed 13:00).
