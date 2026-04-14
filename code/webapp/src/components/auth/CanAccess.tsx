import { useCanAccess } from '@/hooks/use-can-access'

interface CanAccessProps {
  readonly permission?: string
  readonly role?: 'admin' | 'super-admin'
  /** 'hidden' = remove from DOM (default). 'disabled' = render greyed-out wrapper. */
  readonly mode?: 'hidden' | 'disabled'
  readonly children: React.ReactNode
  /** Rendered when access is denied in 'hidden' mode. */
  readonly fallback?: React.ReactNode
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
      // inert prevents both mouse and keyboard interaction (HTML spec).
      // pointer-events-none + cursor-not-allowed give visual feedback.
      // aria-disabled="true" communicates the state to screen readers.
      <span
        className="opacity-50 pointer-events-none cursor-not-allowed inline-block"
        title="Sin acceso"
        aria-disabled="true"
        inert={true}
      >
        {children}
      </span>
    )
  }

  // mode === 'hidden'
  return <>{fallback}</>
}
