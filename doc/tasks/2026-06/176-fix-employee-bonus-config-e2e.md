# 🐛 Task #176: Fix employee-bonus-config E2E test

## 📖 Story

**English:**
The `employee-bonus-config.cy.ts` E2E test was failing because the "Ver detalle" action button in `employee-columns.tsx` was missing the `aria-label="Ver detalle"` attribute that the Cypress selector expected. Additionally, DevDebugger lacked a `data-testid`, the bonus group `<select>` required a native DOM event dispatch for react-hook-form to capture the change, and the active assignment card needed a `data-testid` to avoid a false match with a hidden `<option>` element.

**Español:**
El test E2E `employee-bonus-config.cy.ts` fallaba porque el botón de acción "Ver detalle" en `employee-columns.tsx` no tenía el atributo `aria-label="Ver detalle"` que esperaba el selector de Cypress. Adicionalmente, DevDebugger no tenía `data-testid`, el `<select>` del grupo de bono requería un evento DOM nativo para que react-hook-form captara el cambio, y la tarjeta de asignación activa necesitaba un `data-testid` para evitar coincidencia falsa con un `<option>` oculto.

---

## ✅ Tasks

- [x] 🐛 Add `aria-label="Ver detalle"` to employee table action button in `employee-columns.tsx`
- [x] 🔧 Add `data-testid="dev-debugger"` to DevDebugger (expanded and minimized states)
- [x] 🐛 Fix bonus group `<select>` — dispatch native DOM Event via `ownerDocument.defaultView` for react-hook-form
- [x] 🐛 Add `data-testid="current-bonus-assignment"` to bonus card to avoid false match on hidden `<option>`
- [x] 🔧 Address Copilot review comments on PR #177

---

## 🎯 Acceptance Criteria

- [x] `employee-bonus-config.cy.ts` passes in CI and dev-lab E2E stack

---

## 🔗 References

- **GitHub issue:** #176
- **PR:** #177

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `2h`

### 📅 Sessions
```json
[
  { "date": "2026-06-13", "start": "10:00", "end": "12:00" }
]
```
