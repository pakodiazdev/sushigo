import { useAuthStore } from '@/stores/auth.store'

export interface MenuAccessItem {
  requiredPermission?: string
  requiredRole?: 'admin' | 'super-admin'
  accessMode?: 'hidden' | 'disabled'
}

export type AccessResult = 'show' | 'disabled' | 'hidden'

/**
 * Hook that resolves access for a menu item based on the logged-in user's
 * roles and permissions.
 *
 * Returns:
 *  - 'show'     → render normally
 *  - 'disabled' → render greyed-out and unclickable (accessMode: 'disabled')
 *  - 'hidden'   → exclude from DOM entirely (default for restricted items)
 */
export function useMenuAccess() {
  const { can, isAdmin, isSuperAdmin } = useAuthStore()

  function resolveAccess(item: MenuAccessItem): AccessResult {
    const { requiredPermission, requiredRole, accessMode = 'hidden' } = item

    // No restrictions → always show
    if (!requiredPermission && !requiredRole) return 'show'

    // Check role requirement
    if (requiredRole) {
      const hasRole =
        requiredRole === 'super-admin' ? isSuperAdmin : isAdmin
      if (!hasRole) return accessMode
    }

    // Check permission requirement (admin/super-admin bypass is inside can())
    if (requiredPermission && !can(requiredPermission)) {
      return accessMode
    }

    return 'show'
  }

  return { resolveAccess }
}
