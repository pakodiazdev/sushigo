import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'

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
 * admin and super-admin bypass all checks.
 *
 * Usage:
 *   export const Route = createFileRoute('/configuracion')({
 *     beforeLoad: requireRole('super-admin'),
 *   })
 */
export function requireRole(role: 'admin' | 'super-admin') {
  return () => {
    const { isAuthenticated, isAdmin, isSuperAdmin } = useAuthStore.getState()

    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }

    if (role === 'super-admin' && !isSuperAdmin) {
      throw redirect({ to: '/unauthorized' })
    }

    if (role === 'admin' && !isAdmin) {
      throw redirect({ to: '/unauthorized' })
    }
  }
}
