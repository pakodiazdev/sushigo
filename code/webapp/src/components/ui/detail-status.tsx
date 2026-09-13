import { AlertTriangle, Loader2, Lock, PackageX } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DetailStatusKind = 'loading' | 'error' | 'forbidden' | 'not-found'

interface DetailStatusProps {
  kind: DetailStatusKind
  title?: string
  description?: string
  /** Only rendered for `kind="error"` — retrying a `forbidden`/`not-found` state can't help. */
  onRetry?: () => void
  className?: string
}

const DEFAULTS: Record<DetailStatusKind, { title: string; description?: string }> = {
  loading: { title: 'Cargando…' },
  error: {
    title: 'No se pudo cargar la información',
    description: 'Ocurrió un problema al obtenerla. Intenta de nuevo.',
  },
  forbidden: {
    title: 'No tienes permiso para ver esta información',
    description: 'Solicita acceso a un administrador si crees que esto es un error.',
  },
  'not-found': {
    title: 'Este registro ya no está disponible',
    description: 'Es posible que haya sido eliminado o modificado.',
  },
}

/**
 * The detail-panel counterpart of `DataGrid`'s list-level error/empty states —
 * shared across every SlidePanel/detail section (product variants, price-list
 * assignments, supplier offerings, receipt/transfer detail, …) instead of each
 * screen inventing its own "Cargando…" paragraph with no error or 403 branch.
 */
export function DetailStatus({ kind, title, description, onRetry, className }: Readonly<DetailStatusProps>) {
  const defaults = DEFAULTS[kind]
  const resolvedTitle = title ?? defaults.title
  const resolvedDescription = description ?? defaults.description

  if (kind === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn('flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground', className)}
      >
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <span>{resolvedTitle}</span>
      </div>
    )
  }

  const Icon = kind === 'forbidden' ? Lock : kind === 'not-found' ? PackageX : AlertTriangle

  return (
    <div
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className={cn('flex flex-col items-center justify-center gap-2 p-6 text-center focus:outline-none', className)}
    >
      <Icon className={cn('h-6 w-6', kind === 'error' ? 'text-destructive' : 'text-muted-foreground')} aria-hidden="true" />
      <p className="font-medium text-foreground">{resolvedTitle}</p>
      {resolvedDescription && <p className="max-w-sm text-sm text-muted-foreground">{resolvedDescription}</p>}
      {kind === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
