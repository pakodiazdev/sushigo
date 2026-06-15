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
- **Actual total:** Xh Xm (Nm + Nm + …)
- **vs optimistic:** +Xh Xm  (or −Xh Xm if under)
- **vs pessimistic:** +Xh Xm  (or −Xh Xm if under)

**Justification:**
<narrative explaining why the task took more (or less) time than estimated.
Focus on activities not contemplated in the original scope: unplanned rework,
discovered technical debt, extra review cycles, scope additions, etc.>
```

### Rules
- **Always fill it when closing** — even if the task finished within the estimate. In that case, note what went well.
- **Actual total** must match the sum of all session durations. Show the per-session breakdown in minutes.
- **Justification** must explain *why*, not just *what*. Reviewers should understand the root cause after reading it.
- If the task finished under the pessimistic estimate with no surprises, a one-liner justification is enough.
- Write in English (consistent with the project language rule).

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
- **Actual total:** 3h 30m (90 min + 120 min)
- **vs optimistic:** +1h 30m
- **vs pessimistic:** −1h 30m

**Justification:**

The middleware itself was ready within the optimistic estimate. The extra time was caused by setting up the CI pipeline to run integration tests, which was not contemplated in the original scope and required additional research.
```
