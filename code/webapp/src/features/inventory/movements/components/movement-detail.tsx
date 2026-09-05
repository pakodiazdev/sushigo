import { ArrowRight } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { MovementDirectionBadge } from './movement-direction-badge'
import {
  formatMovementSource,
  formatMovementTimestamp,
  reasonLabels,
  statusBadgeClasses,
  statusLabels,
} from '../lib/movement-presentation'
import type { MovementLinkRef, StockMovement } from '../types'

interface MovementDetailProps {
  movement: StockMovement
  /** Follow a cross-linked original/compensating movement in place. */
  onOpenLinked?: (id: string) => void
}

function LinkedMovementRow({
  label,
  link,
  onOpen,
}: Readonly<{ label: string; link: MovementLinkRef; onOpen?: (id: string) => void }>) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
      <div>
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{reasonLabels[link.reason]}</p>
        <p className="text-xs text-muted-foreground">
          {statusLabels[link.status]} · {formatMovementTimestamp(link.posted_at)}
        </p>
      </div>
      {onOpen && (
        <button
          type="button"
          onClick={() => onOpen(link.id)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Read-only audit view for one immutable movement (#574): direction,
 * quantity/UOM, source → destination, origin document, actor, reference,
 * lifecycle status and the two-way reversal linkage. It renders nothing that
 * can mutate the movement.
 */
export function MovementDetail({ movement, onOpenLinked }: Readonly<MovementDetailProps>) {
  const uom = movement.variant?.base_uom
  const quantityLabel = uom
    ? `${movement.quantity} ${uom.symbol ?? uom.code}`
    : String(movement.quantity)

  return (
    <SlidePanel.Body className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MovementDirectionBadge direction={movement.direction} isReversal={movement.is_reversal} />
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClasses[movement.status]}`}
        >
          {statusLabels[movement.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Motivo</p>
          <p className="font-medium text-foreground">{reasonLabels[movement.reason]}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cantidad</p>
          <p className="font-medium text-foreground" data-testid="movement-quantity">
            {quantityLabel}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Variante</p>
          <p className="font-medium text-foreground">
            {movement.variant ? `${movement.variant.name} (${movement.variant.code})` : 'No disponible'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">UOM base</p>
          <p className="font-medium text-foreground">{uom ? `${uom.name} (${uom.code})` : '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Ubicación</p>
          <p className="flex items-center gap-2 font-medium text-foreground">
            <span>{movement.from_location?.name ?? 'Externo'}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-label="hacia" />
            <span>{movement.to_location?.name ?? 'Externo'}</span>
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Referencia</p>
          <p className="font-medium text-foreground">{movement.reference ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Origen</p>
          <p className="font-medium text-foreground">{formatMovementSource(movement.source)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Responsable</p>
          <p className="font-medium text-foreground">{movement.actor?.name ?? 'No disponible'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Publicado</p>
          <p className="font-medium text-foreground">{formatMovementTimestamp(movement.posted_at)}</p>
        </div>
        {movement.notes && (
          <div className="col-span-2">
            <p className="text-muted-foreground">Notas</p>
            <p className="text-foreground">{movement.notes}</p>
          </div>
        )}
      </div>

      {(movement.reverses || movement.reversed_by) && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Trazabilidad de reversa</p>
          {movement.reverses && (
            <LinkedMovementRow
              label="Este movimiento revierte a"
              link={movement.reverses}
              onOpen={onOpenLinked}
            />
          )}
          {movement.reversed_by && (
            <LinkedMovementRow
              label="Revertido por"
              link={movement.reversed_by}
              onOpen={onOpenLinked}
            />
          )}
          {movement.reversed_at && (
            <p className="text-xs text-muted-foreground">
              Revertido el {formatMovementTimestamp(movement.reversed_at)}
              {movement.reversal_reason ? ` · ${movement.reversal_reason}` : ''}
            </p>
          )}
        </div>
      )}
    </SlidePanel.Body>
  )
}
