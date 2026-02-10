# 🌐 Task #065: Punctuality Configuration API

## 📖 Story

**English:**
As an Admin, I want to manage punctuality ranges, bonus groups, and exceptions via API.

**Español:**
Como Admin, quiero gestionar rangos, grupos de bono y excepciones de puntualidad vía API.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/punctuality/ranges` — list; `PUT /api/v1/punctuality/ranges` — bulk update
- [ ] 🌐 `GET /api/v1/punctuality/bonus-groups` — list; `POST /api/v1/punctuality/bonus-groups` — create
- [ ] 🌐 `POST /api/v1/employees/{id}/bonus-config` — assign group
- [ ] 🌐 `POST /api/v1/employees/{id}/punctuality-exceptions` — create exception; `GET ...` — list
- [ ] 🧪 Feature tests for each endpoint

---

## 🎯 Acceptance Criteria

- [ ] All CRUD endpoints work
- [ ] Validation enforces rules

---

## 🔗 References

- **Backlog:** AP-030
- RF-32, RF-33, RF-37
- domain-model.md §2.16–2.19

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h`
- **Pessimistic:** `6h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
