import { redirect } from '@tanstack/react-router'
import { useAuthStore, checkIsAdmin, checkIsSuperAdmin } from '@/stores/auth.store'

/**
 * Factory that returns a `beforeLoad` function requiring a specific permission.
 * Uses `getState()` (non-reactive) — safe to call synchronously in beforeLoad.
 * admin and super-admin bypass all permission checks (handled by `can()`).
 *
 * Usage:
 *   export const Route = createFileRoute('/employees')({
 *     beforeLoad: requirePermission('employees.view'),
 *   })
 */
export function requirePermission(permission: string) {
  return () => {
    const { isAuthenticated, can } = useAuthStore.getState()

    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }

    if (!can(permission)) {
      throw redirect({ to: '/unauthorized' })
    }
  }
}

/**
 * Factory that returns a `beforeLoad` function requiring a specific role.
 * Computes role from persisted `user.roles` data (same as `requirePermission`
 * does via `can()`) to avoid a race condition where `isAdmin`/`isSuperAdmin`
 * booleans are still `false` after rehydration until the queueMicrotask fires.
 *
 * - Authenticated users without the role → redirect to `/unauthorized`
 * - Unauthenticated users → redirect to `/login`
 * - `super-admin` satisfies both `'admin'` and `'super-admin'` checks.
 *
 * Usage:
 *   export const Route = createFileRoute('/configuracion')({
 *     beforeLoad: requireRole('super-admin'),
 *   })
 */
export function requireRole(role: 'admin' | 'super-admin') {
  return () => {
    const { isAuthenticated, user } = useAuthStore.getState()

    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }

    if (role === 'super-admin' && !checkIsSuperAdmin(user)) {
      throw redirect({ to: '/unauthorized' })
    }

    if (role === 'admin' && !checkIsAdmin(user)) {
      throw redirect({ to: '/unauthorized' })
    }
  }
}
