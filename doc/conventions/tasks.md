# 📑 Instructions: How to Fill Task Template

Use the following structure to describe and track each task.
Replace placeholders with actual task details.

---

## 1. Title
- Format: **Short, action-oriented, with emoji**.
  Example:
  - `# 🐳 Initialize basic monorepo structure`
  - `# 🔒 Add authentication middleware`

---

## 2. Story
- Write in **user story format**:
  ```
  As a [role], I need [action/goal], so that [benefit].
  ```
- Keep it short and clear.
  Example:
  > As a developer, I need to set up a monorepo so that future modules can be versioned and maintained consistently.

---

## 3. Technical Tasks
- List **technical steps** as checklist items.
- Use `[ ]` for pending, `[x]` for done.
- Prefix with relevant emoji if useful:
  - 📂 for folder/file actions
  - 🔧 for implementation
  - 🧪 for testing
  - 📝 for documentation
- Example:
  ```
  - [ ] 📂 Create repository
  - [ ] 🗂️ Initialize folder structure
  - [ ] 🔧 Configure CI/CD pipeline
  ```

---

## 4. Time Tracking
### Estimates
- Define three values in hours:
  - **Optimistic:** minimum time if everything goes well.
  - **Pessimistic:** maximum time if issues appear.
  - **Tracked:** actual time spent (sum of all sessions).

### Sessions
- Log working sessions in JSON format:
  ```json
  [
    { "date": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM" }
  ]
  ```
- Add multiple objects for multiple sessions.

---

## 5. Deviation (mandatory when closing a task)

Fill this section when the task is completed. It compares the tracked time against estimates and justifies any overrun. This serves as historical context for future estimations.

### Format
```markdown
## 📊 Desviación
- **Total real:** Xh Xm (Nm + Nm + …)
- **Diferencia vs optimista:** +Xh Xm  (or −Xh Xm if under)
- **Diferencia vs pesimista:** +Xh Xm  (or −Xh Xm if under)

**Justificación:**
<narrative explaining why the task took more (or less) time than estimated.
Focus on activities not contemplated in the original scope: unplanned rework,
discovered technical debt, extra review cycles, scope additions, etc.>
```

### Rules
- **Always fill it when closing** — even if the task finished within the estimate. In that case, note what went well.
- **Total real** must match the sum of all session durations. Show the per-session breakdown in minutes.
- **Justificación** must explain *why*, not just *what*. Reviewers should understand the root cause after reading it.
- If the task finished under the pessimistic estimate with no surprises, a one-liner justification is enough.
- Write in Spanish (consistent with the label `Desviación`).

---

## ✅ Example (for reference)
```markdown
# 🛡️ Implement authentication middleware

## 📖 Story
As a developer, I need to add authentication middleware so that only authorized users can access protected routes.

---

## ✅ Technical Tasks
- [x] 🔧 Create middleware file
- [x] 📝 Write unit tests
- [x] 📂 Register middleware in project config

---

## ⏱️ Time
### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `5h`
- **Tracked:** `3h 30m`

### 📅 Sessions
```json
[
  { "date": "2025-09-28", "start": "10:00", "end": "11:30" },
  { "date": "2025-09-28", "start": "14:00", "end": "16:00" }
]
```

## 📊 Desviación
- **Total real:** 3h 30m (90 min + 120 min)
- **Diferencia vs optimista:** +1h 30m
- **Diferencia vs pesimista:** −1h 30m

**Justificación:**

La implementación del middleware estuvo lista en el tiempo optimista. El tiempo extra se debió a la configuración del pipeline de CI para ejecutar los tests de integración, que no estaba contemplada en el alcance original y requirió investigación adicional.
```
