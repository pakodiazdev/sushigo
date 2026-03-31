import { Zap } from 'lucide-react'

// ── DayLabel ──────────────────────────────────────────────────────────────────

/**
 * Three visual states:
 *   ⚡ (Zap)  — hasTemporaryOverride: there are active/upcoming exceptions
 *   ● (dot)   — hasPermanentOverride only: the day's schedule was permanently
 *               changed and that change is already in effect (it IS the schedule)
 *   (nothing) — no overrides
 *
 * Temporary exceptions take visual priority when both flags are true.
 */
export function DayLabel({
  label,
  hasTemporaryOverride,
  hasPermanentOverride,
  onClickOverride,
}: {
  readonly label: string
  readonly hasTemporaryOverride: boolean
  readonly hasPermanentOverride: boolean
  readonly onClickOverride?: () => void
}) {
  const showZap = hasTemporaryOverride
  const showDot = !hasTemporaryOverride && hasPermanentOverride

  return (
    <span className="flex items-center gap-1">
      {label}
      {showZap && (
        onClickOverride ? (
          <button
            onClick={onClickOverride}
            title="Ver excepciones"
            className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            <Zap className="h-3 w-3 text-amber-500" />
          </button>
        ) : (
          <span title="Tiene una excepción activa o próxima">
            <Zap className="h-3 w-3 text-amber-500" aria-hidden />
          </span>
        )
      )}
      {showDot && (
        onClickOverride ? (
          <button
            onClick={onClickOverride}
            title="Cambio permanente activo — ver historial"
            className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          </button>
        ) : (
          <span
            className="inline-block h-2 w-2 rounded-full bg-amber-500"
            title="Cambio permanente activo"
          />
        )
      )}
    </span>
  )
}
