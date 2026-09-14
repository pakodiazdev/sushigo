import { Loader2, AlertTriangle } from 'lucide-react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { isChunkLoadError } from '@/lib/route-chunk-error'

/**
 * Router-wide `defaultPendingComponent` (#577) — shown while a lazily-loaded route
 * chunk (`*.lazy.tsx`) is still downloading. Mirrors `DetailStatus`'s `loading` kind,
 * full-page instead of panel-scoped.
 */
export function RoutePendingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground"
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <span>Cargando…</span>
    </div>
  )
}

/**
 * Router-wide `defaultErrorComponent` (#577). A failed lazy-route chunk import is the
 * one error this boundary treats specially: `reset()` just re-runs the same failing
 * dynamic import, so the real fix is a full reload to fetch the new asset manifest
 * after a deploy. Every other route error keeps the ordinary `reset()` retry.
 */
export function RouteErrorFallback({ error, reset }: Readonly<ErrorComponentProps>) {
  const chunkLoadFailure = isChunkLoadError(error)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="font-medium text-foreground">
        {chunkLoadFailure ? 'Hay una nueva versión disponible' : 'Ocurrió un error al cargar esta página'}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {chunkLoadFailure
          ? 'Recarga la página para obtener la versión más reciente.'
          : 'Intenta de nuevo. Si el problema persiste, contacta a soporte.'}
      </p>
      <button
        type="button"
        onClick={() => (chunkLoadFailure ? window.location.reload() : reset())}
        className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {chunkLoadFailure ? 'Recargar' : 'Reintentar'}
      </button>
    </div>
  )
}
