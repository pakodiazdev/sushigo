# 🔐 Consolidate Auth State Management (Context API vs Zustand)

## 📖 Story

**English:**
As a developer, I need to consolidate authentication state management into a single source of truth, to eliminate code duplication, state inconsistencies, and reduce maintenance complexity.

**Español:**
Como desarrollador, necesito consolidar el manejo del estado de autenticación en una única fuente de verdad (Single Source of Truth), para eliminar la duplicación de código, inconsistencias entre estados y reducir la complejidad del mantenimiento.

---

## 🔍 Problem Context

The project previously had **two competing systems** handling authentication:

### 1. Context API (`AuthContext.tsx`)
- **Location**: [src/contexts/AuthContext.tsx](../../code/webapp/src/contexts/AuthContext.tsx)
- **Features**:
  - Managed `user`, `token`, `currentBranch`, `availableBranches`
  - Included `login`, `logout`, `switchBranch`, `refreshUser` functions
  - Had permission logic (`can`, `isAdmin`)
  - Manual localStorage persistence
  - **215 lines**

### 2. Zustand Store (`auth.store.ts`)
- **Location**: [src/stores/auth.store.ts](../../code/webapp/src/stores/auth.store.ts)
- **Features**:
  - Managed `user`, `token`, `isAuthenticated`, `isLoading`, `error`
  - Included `login`, `logout`, `initializeAuth`, `clearError` functions
  - Used Zustand `persist` middleware
  - Did NOT handle branches
  - **155 lines**

### Previous Component Usage

| File | Hook Used | Purpose |
|------|-----------|---------|
| `login.tsx` | `useAuthStore` | Login flow |
| `logout.tsx` | `useAuthStore` | Logout flow |
| `Layout.tsx` | `useAuthStore` | Auth guard, initialization |
| `Header.tsx` | `useAuthStore` | User display |
| `DevDebugger.tsx` | `useAuthStore` | Debug info |
| `Dashboard.tsx` | `useAuth` | Branch info |
| `BranchSwitcher.tsx` | `useAuth` | Branch switching |
| `BranchSelectionDialog.tsx` | `useAuth` | Branch selection |

### Identified Problems
1. **Duplicated state**: User and token existed in two places
2. **Potential inconsistency**: One store could update without the other
3. **Import confusion**: Developers didn't know which to use
4. **Distributed logic**: Branches in Context, basic auth in Zustand
5. **Excessive logging**: Store had ~15 console.log for debugging

---

## 🎯 Recommended Decision

**Keep Zustand as the single source** and migrate branch functionality.

### Justification
1. Zustand has built-in persistence (less manual code)
2. No Provider wrapper required in component tree
3. Better DevTools support
4. Consistent pattern with future stores
5. Less boilerplate than Context API

---

## ✅ Technical Tasks

### Phase 1: Preparation
- [x] 📝 Create backup of both current files
- [x] 🔍 Audit all imports of `useAuth` and `useAuthStore`
- [x] 📋 Document all properties/methods used from each system

### Phase 2: Consolidate into Zustand
- [x] 🔧 Add missing properties to store:
  - `currentBranch: Branch | null`
  - `availableBranches: Branch[]`
- [x] 🔧 Add missing methods to store:
  - `switchBranch(branchId: number): Promise<void>`
  - `refreshUser(): Promise<void>`
- [x] 🔧 Add computed getters:
  - `isAdmin: boolean`
  - `can(permission: string): boolean`
- [x] 🔧 Implement branch extraction logic from user
- [x] 🔧 Update `partialize` to include selected branch

### Phase 3: Migrate Components
- [x] 🔄 Migrate `Dashboard.tsx`: `useAuth` → `useAuthStore`
- [x] 🔄 Migrate `BranchSwitcher.tsx`: `useAuth` → `useAuthStore`
- [x] 🔄 Migrate `BranchSelectionDialog.tsx`: `useAuth` → `useAuthStore`

### Phase 4: Cleanup
- [x] 🗑️ Delete `AuthContext.tsx`
- [x] 🗑️ Remove `AuthProvider` from component tree (in `App.tsx`)
- [x] 🧹 Remove debug console.log from `auth.store.ts`
- [x] 🧹 Remove debug console.log from `Layout.tsx`

### Phase 5: Validation
- [x] 🧪 Run `npm run typecheck` with no errors
- [x] 🧪 Verify login flow works correctly (manual)
- [x] 🧪 Verify logout clears all state (manual)
- [x] 🧪 Verify branch switching works (manual)
- [x] 🧪 Verify persistence - page refresh maintains session (manual)
- [x] 🧪 Verify permissions (`can`) work (manual)

### Phase 6: Documentation
- [x] 📝 Update `RESUME_STATUS.md` marking task as completed

---

## 📁 Files Involved

### Modified
- `code/webapp/src/stores/auth.store.ts` - Added functionality
- `code/webapp/src/pages/Dashboard.tsx` - Changed import
- `code/webapp/src/components/auth/BranchSwitcher.tsx` - Changed import
- `code/webapp/src/components/auth/BranchSelectionDialog.tsx` - Changed import
- `code/webapp/src/App.tsx` - Removed AuthProvider

### Deleted
- `code/webapp/src/contexts/AuthContext.tsx`

### Reviewed
- `code/webapp/src/types/auth.ts` - Verified shared types

---

## ⚠️ Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Losing branch functionality | Medium | High | Copy exact logic from AuthContext |
| Corrupted localStorage state | Low | Medium | Increment version in persist config |
| Breaking login flow | Medium | High | Test manually after each change |
| Forgotten imports | Low | Low | Use grep to verify all usages |

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h`
- **Pessimistic:** `6h`
- **Tracked:** `1h`

### 📅 Sessions
```json
[
  { "date": "2026-02-03", "start": "00:00", "end": "01:00" }
]
```

---

## 📚 References

- [RESUME_STATUS.md - High Priority Area #1](../../../RESUME_STATUS.md#alta-prioridad)
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [TanStack Query + Zustand patterns](https://tanstack.com/query/latest/docs/react/guides/zustand)
