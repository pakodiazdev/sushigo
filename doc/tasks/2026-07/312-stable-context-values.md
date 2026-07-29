# 🔨 Task #312: React Context Provider values should have stable identities (typescript:S6481)

## 📖 Story

**English:**
As a developer, I need Context Provider `value` props to have stable identities across renders, so consumers don't re-render unnecessarily and SonarCloud's maintainability rule `typescript:S6481` is resolved.

**Español:**
Como desarrollador, necesito que los `value` de los Context Providers tengan identidad estable entre renders, para que los consumidores no se re-rendericen innecesariamente y se resuelva la regla de mantenibilidad `typescript:S6481` de SonarCloud.

---

## 🔍 SonarCloud Findings

| Rule | Severity | Count | Category |
|---|---|---|---|
| `typescript:S6481` | MAJOR | 3 | Maintainability |

**Affected locations:**
- `src/components/ui/toast-provider.tsx:51`
- `src/contexts/SidebarContext.tsx:18`
- `src/contexts/ThemeContext.tsx:26`

---

## ✅ Technical Tasks

- [x] 🔨 `SidebarContext.tsx`: wrap `toggleSidebar`, `toggleMobileSidebar`, `closeMobileSidebar` in `useCallback`; wrap the Provider `value` object in `useMemo`
- [x] 🔨 `ThemeContext.tsx`: wrap `toggleTheme` in `useCallback`; wrap the Provider `value` object in `useMemo`
- [x] 🔨 `toast-provider.tsx`: wrap the Provider `value` object in `useMemo` (the 5 functions are already `useCallback`-wrapped)
- [x] ✅ Add value-identity-stability test to `SidebarContext.test.tsx`
- [x] ✅ Add value-identity-stability test to `toast-provider.test.tsx`
- [x] ✅ `ThemeContext.test.tsx` already had coverage — added value-identity-stability test to it
- [x] 🧪 Run `npx vitest run` and confirm no regressions (242 files, 3546 passed, 3 pre-existing skipped)
- [x] 🔍 Run `npm run lint` and `npm run typecheck` (0 errors; 2 pre-existing unrelated warnings)

---

## 🎯 Acceptance Criteria

- [x] All 3 flagged `typescript:S6481` occurrences resolved
- [x] No behavior change — existing Vitest suites pass
- [x] Context `value` reference stays identical across parent re-renders when no dependency changed

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `1.5h`
- **Tracked:** `0.27h`

### 📅 Sessions
```json
[
  { "date": "2026-07-28", "start": "19:34", "end": "19:50" }
]
```

---

## 📊 Retrospective
- **Actual total:** 16m (16m)
- **vs optimistic:** −14m
- **vs pessimistic:** −1h14m

**Justification:** The fix was mechanical and scoped exactly as anticipated — wrap each Provider's `value` in `useMemo` and its inline handlers in `useCallback`, no design decisions or unexpected edge cases involved. Two of the three test files already had partial coverage (`SidebarContext.test.tsx`, `ThemeContext.test.tsx`), so only one small stability assertion needed adding per file rather than building suites from scratch.

---

## 🔗 References

- GitHub issue: [#312](https://github.com/pakodiazdev/sushigo/issues/312)
- SonarCloud: https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S6481
