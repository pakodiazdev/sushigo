import { useCanAccess } from '@/hooks/use-can-access'

interface CanAccessProps {
  permission?: string
  role?: 'admin' | 'super-admin'
  /** 'hidden' = remove from DOM (default). 'disabled' = render greyed-out wrapper. */
  mode?: 'hidden' | 'disabled'
  children: React.ReactNode
  /** Rendered when access is denied in 'hidden' mode. */
  fallback?: React.ReactNode
}

/**
 * Inline access guard for UI elements (buttons, tabs, panels).
 *
 * Usage:
 *   <CanAccess permission="employees.create">
 *     <Button>Agregar empleado</Button>
 *   </CanAccess>
 *
 *   <CanAccess permission="leaves.approve" mode="disabled">
 *     <Button>Aprobar permiso</Button>
 *   </CanAccess>
 *
 *   <CanAccess role="super-admin">
 *     <AdminPanel />
 *   </CanAccess>
 */
export function CanAccess({
  permission,
  role,
  mode = 'hidden',
  children,
  fallback = null,
}: CanAccessProps) {
  const hasAccess = useCanAccess({ permission, role })

  if (hasAccess) return <>{children}</>

  if (mode === 'disabled') {
    return (
      <span
        className="opacity-50 pointer-events-none cursor-not-allowed inline-block"
        title="Sin acceso"
        aria-disabled="true"
      >
        {children}
      </span>
    )
  }

  // mode === 'hidden'
  return <>{fallback}</>
}
