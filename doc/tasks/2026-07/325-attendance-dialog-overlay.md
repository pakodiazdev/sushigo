# 🐛 Task #325: Overlay del diálogo "Registrar entrada" no cubre toda la pantalla

## 📖 Story

**English:**
As a Manager, I need the "Registrar entrada" confirmation dialog to dim and block the entire screen, so that I can't accidentally interact with the sidebar/header behind it while confirming an attendance action.

**Español:**
Como Manager, necesito que el diálogo de confirmación de "Registrar entrada" atenúe y bloquee toda la pantalla, para no poder interactuar accidentalmente con el sidebar/header detrás de él al confirmar una acción de asistencia.

---

## 🐞 Root Cause

`AttendanceTimeDialog` (`code/webapp/src/components/attendance/AttendanceTimeDialog.tsx`) renders a `ConfirmDialog` without the `container="viewport"` prop. Per `ConfirmDialog`'s doc comment (`code/webapp/src/components/ui/confirm-dialog.tsx`), omitting `container` makes it render inline with absolute positioning, covering only the nearest positioned ancestor — not the full browser window.

For comparison, the "confirm falta" dialog in `EmployeeAttendanceCard.tsx` (same page) already passes `container="viewport"` and renders correctly full-screen.

Since `code/webapp/src/pages/attendance/index.tsx` reuses `AttendanceTimeDialog` for check-in, lunch-start, lunch-return, and check-out, all four dialogs share this bug — fixing `AttendanceTimeDialog` fixes all of them.

---

## ✅ Technical Tasks

- [x] 🔧 Add `container="viewport"` to the `ConfirmDialog` rendered inside `AttendanceTimeDialog`
- [ ] 🧪 Manually verify all four flows (check-in, lunch-start, lunch-return, check-out) show a full-screen dimmed overlay
- [x] 🧪 Add/update a test in `AttendanceTimeDialog.test.tsx` asserting the dialog portals to `document.body`

---

## 🎯 Acceptance Criteria

- [x] Confirm dialog overlay dims and blocks the entire viewport (sidebar + header included) for all four attendance actions
- [x] `AttendanceTimeDialog.test.tsx` verifies the dialog is portaled to `document.body`

---

## 🔗 References

- **Issue:** #325

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1.5h` · **Tracked:** `16m`

### 📅 Sessions
```json
[
  { "date": "2026-07-26", "start": "19:06", "end": "19:22" }
]
```

## 📊 Retrospective
- **Actual total:** 16m (16 min)
- **vs optimistic:** −14m
- **vs pessimistic:** −1h 14m

**Justification:**

Finished well under estimate — the fix was a one-line prop addition (`container="viewport"`) already validated by an existing correct usage elsewhere in the same page (`EmployeeAttendanceCard.tsx`), so no design or debugging work was needed. Time went into writing a portal-assertion test that reproduces the bug (fails without the fix) and updating four pre-existing tests whose `container`-scoped queries broke once the dialog content correctly moved to `document.body`. Manual in-browser verification of the four flows was not performed this session (no browser automation available) — flagged as an open item for reviewer/manual QA before merge.
