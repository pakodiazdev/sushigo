import { ArrowRight, CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Textarea } from '@/components/ui/form-fields'
import { CanAccess } from '@/components/auth'
import { useStockTransferDetails } from '../hooks/use-stock-transfer-details'
import type { StockTransfer } from '../types'

interface StockTransferDetailsProps {
  transfer: StockTransfer
  onEdit: () => void
  onDelete: () => void
  onPost: () => void
  onReverse: (reason: string) => void
  isDeleting: boolean
  isPosting: boolean
  isReversing: boolean
}

const statusStyles: Record<StockTransfer['status'], string> = {
  DRAFT: 'bg-muted text-muted-foreground ring-border',
  POSTED: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50',
  REVERSED: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/50',
}

const statusLabels: Record<StockTransfer['status'], string> = {
  DRAFT: 'Borrador',
  POSTED: 'Confirmado',
  REVERSED: 'Revertido',
}

export function StockTransferDetails({
  transfer,
  onEdit,
  onDelete,
  onPost,
  onReverse,
  isDeleting,
  isPosting,
  isReversing,
}: Readonly<StockTransferDetailsProps>) {
  const {
    showDeleteConfirm,
    setShowDeleteConfirm,
    showPostConfirm,
    setShowPostConfirm,
    showReverseConfirm,
    setShowReverseConfirm,
    reverseReason,
    setReverseReason,
    openReverseConfirm,
  } = useStockTransferDetails()

  const isDraft = transfer.status === 'DRAFT'
  const isPosted = transfer.status === 'POSTED'
  // A cross-unit transfer is readable with access to one endpoint, but every
  // mutation 403s without access to both — gate the action buttons on the
  // server flag, not on `stock.manage` alone.
  const canDelete = isDraft && transfer.can_mutate
  const canReverse = isPosted && transfer.can_mutate

  return (
    <div className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-3 py-1 text-sm font-medium text-foreground">
            {transfer.reference ?? 'Sin referencia'}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[transfer.status]}`}>
            {statusLabels[transfer.status]}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span>{transfer.source_location?.name ?? 'Origen no disponible'}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span>{transfer.destination_location?.name ?? 'Destino no disponible'}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Fecha del traslado</p>
            <p className="font-medium text-foreground">{transfer.transfer_date}</p>
          </div>
          {transfer.notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Notas</p>
              <p className="text-foreground">{transfer.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Líneas</p>
          {transfer.lines.map((line) => (
            <div key={line.id} className="space-y-1 rounded-md border border-border p-3 text-sm">
              <p className="font-medium text-foreground">
                {line.variant ? `${line.variant.name} (${line.variant.code})` : 'Variante no disponible'}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <p>
                  Cantidad:{' '}
                  <span className="text-foreground">
                    {line.entry_quantity} {line.entry_uom?.symbol ?? ''}
                  </span>
                </p>
                <p>Factor: <span className="text-foreground">×{line.conversion_factor}</span></p>
                <p>Cantidad base: <span className="text-foreground">{line.base_quantity}</span></p>
                {line.source_unit_cost !== null && (
                  <p>Costo origen: <span className="text-foreground">{line.source_unit_cost}</span></p>
                )}
              </div>
            </div>
          ))}
        </div>

        {isPosted && transfer.posted_at && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
            <p>
              Confirmado el {new Date(transfer.posted_at).toLocaleString('es-MX')}
              {transfer.posted_by ? ` por ${transfer.posted_by.name}` : ''}.
            </p>
            <p className="mt-1">
              El inventario ya se movió del origen al destino y no puede editarse. Puede revertirse si fue un error.
            </p>
          </div>
        )}

        {transfer.status === 'REVERSED' && transfer.reversed_at && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <p>
              Revertido el {new Date(transfer.reversed_at).toLocaleString('es-MX')}
              {transfer.reversed_by ? ` por ${transfer.reversed_by.name}` : ''}.
            </p>
            {transfer.reversal_reason && <p className="mt-1">Motivo: {transfer.reversal_reason}</p>}
          </div>
        )}
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-between">
          {canDelete && (
            <CanAccess permission="stock.manage">
              <Button variant="outline-danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </CanAccess>
          )}
          {canReverse && (
            <CanAccess permission="stock.manage">
              <Button variant="outline" onClick={openReverseConfirm}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Revertir
              </Button>
            </CanAccess>
          )}
          {canDelete && (
            <div className="flex gap-3">
              <CanAccess permission="stock.manage">
                <Button variant="outline" onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </CanAccess>
              <CanAccess permission="stock.manage">
                <Button onClick={() => setShowPostConfirm(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar traslado
                </Button>
              </CanAccess>
            </div>
          )}
        </div>
      </SlidePanel.Footer>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete()
          setShowDeleteConfirm(false)
        }}
        title="Eliminar traslado"
        description="¿Confirmas que deseas eliminar este borrador de traslado? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        onConfirm={() => {
          onPost()
          setShowPostConfirm(false)
        }}
        title="Confirmar traslado"
        description="Al confirmar, se descontará la cantidad del origen y se aumentará en el destino. No podrá editarse después."
        confirmLabel="Confirmar"
        variant="info"
        isLoading={isPosting}
      />

      <ConfirmDialog
        isOpen={showReverseConfirm}
        onClose={() => setShowReverseConfirm(false)}
        onConfirm={() => {
          onReverse(reverseReason)
          setShowReverseConfirm(false)
        }}
        title="Revertir traslado"
        description={
          <div className="space-y-3">
            <p>
              ¿Confirmas que deseas revertir este traslado? Se devolverá la cantidad al origen y se
              descontará del destino.
            </p>
            <div className="space-y-1">
              <label htmlFor="reverse_reason" className="text-xs font-medium text-foreground">
                Motivo <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="reverse_reason"
                placeholder="Ej: Traslado registrado por error"
                rows={2}
                value={reverseReason}
                onChange={(event) => setReverseReason(event.target.value)}
              />
            </div>
          </div>
        }
        confirmLabel="Revertir"
        variant="danger"
        isLoading={isReversing}
      />
    </div>
  )
}
