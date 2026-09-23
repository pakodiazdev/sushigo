import { FlaskConical } from 'lucide-react'
import { useDemoMode } from '../hooks/use-demo-mode'

/**
 * Persistent disclaimer shown on every page of the public Demo (#635) so it is
 * never mistaken for live SushiGo operations. Renders nothing elsewhere.
 */
export function DemoBanner() {
  const { isDemo, dataResets, demoEmail } = useDemoMode()

  if (!isDemo) return null

  return (
    <div
      role="status"
      data-testid="demo-banner"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 border-b border-amber-300"
    >
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-semibold">Entorno de demostración</span>
      <span>— los datos son ficticios{dataResets ? ' y se restablecen periódicamente' : ''}.</span>
      {demoEmail && (
        <span>
          Cuenta de acceso: <code className="font-mono">{demoEmail}</code>
        </span>
      )}
    </div>
  )
}
