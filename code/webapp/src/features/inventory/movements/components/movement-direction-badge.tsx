import { directionPresentation, reversalBadgeClass } from '../lib/movement-presentation'
import type { MovementDirection } from '../types'

interface MovementDirectionBadgeProps {
  direction: MovementDirection
  isReversal: boolean
}

/**
 * Visual distinction between entry, exit, transfer and single-location
 * adjustment (#574), with a separate "Reversa" chip when the row is a
 * compensating reversal — never the removed legacy `type` field.
 */
export function MovementDirectionBadge({
  direction,
  isReversal,
}: Readonly<MovementDirectionBadgeProps>) {
  const preset = directionPresentation[direction]

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${preset.badgeClass}`}
      >
        <span aria-hidden="true">{preset.glyph}</span>
        <span>{preset.label}</span>
        <span className="sr-only"> — {preset.srLabel}</span>
      </span>
      {isReversal && (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${reversalBadgeClass}`}
        >
          Reversa
        </span>
      )}
    </span>
  )
}
