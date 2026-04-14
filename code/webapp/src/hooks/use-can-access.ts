import { useAuthStore } from '@/stores/auth.store'

interface UseCanAccessOptions {
  permission?: string
  role?: 'admin' | 'super-admin'
}

/**
 * Imperative hook for checking access inside handlers and custom hooks.
 *
 * Usage:
 *   const canApprove = useCanAccess({ permission: 'leaves.approve' })
 *   if (!canApprove) return
 */
export function useCanAccess({ permission, role }: UseCanAccessOptions): boolean {
  const { can, isAdmin, isSuperAdmin } = useAuthStore()

  if (!permission && !role) return true

  if (role) {
    const hasRole = role === 'super-admin' ? isSuperAdmin : isAdmin
    if (!hasRole) return false
  }

  if (permission && !can(permission)) return false

  return true
}
