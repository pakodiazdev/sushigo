import { CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Textarea } from '@/components/ui/form-fields'
import { CanAccess } from '@/components/auth'
import { formatCurrency } from '@/lib/format'
import { useReceiptDetails } from '../hooks/use-receipt-details'
import type { Receipt } from '../types'

interface ReceiptDetailsProps {
  receipt: Receipt
  onEdit: () => void
  onDelete: () => void
  onPost: () => void
  onReverse: (reason: string) => void
  isDeleting: boolean
  isPosting: boolean
  isReversing: boolean
}

const statusStyles: Record<Receipt['status'], string> = {
  DRAFT: 'bg-muted text-muted-foreground ring-border',
  POSTED: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50',
  REVERSED: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/50',
}

const statusLabels: Record<Receipt['status'], string> = {
  DRAFT: 'Borrador',
  POSTED: 'Confirmada',
  REVERSED: 'Revertida',
}

export function ReceiptDetails({
  receipt,
  onEdit,
  onDelete,
  onPost,
  onReverse,
  isDeleting,
  isPosting,
  isReversing,
}: Readonly<ReceiptDetailsProps>) {
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
  } = useReceiptDetails()

  const isDraft = receipt.status === 'DRAFT'
  const isPosted = receipt.status === 'POSTED'

  return (
    <div className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-3 py-1 text-sm font-medium text-foreground">
            {receipt.reference ?? 'Sin referencia'}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[receipt.status]}`}>
            {statusLabels[receipt.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Proveedor</p>
            <p className="font-medium text-foreground">{receipt.supplier?.name ?? 'No disponible'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Almacén receptor</p>
            <p className="font-medium text-foreground">{receipt.destination_location?.name ?? 'No disponible'}</p>
            {receipt.destination_location?.operating_unit && (
              <p className="text-xs text-muted-foreground">
                {receipt.destination_location.operating_unit.name} · {receipt.destination_location.type}
              </p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Fecha de recepción</p>
            <p className="font-medium text-foreground">{receipt.receipt_date}</p>
          </div>
          {receipt.notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Notas</p>
              <p className="text-foreground">{receipt.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Líneas</p>
          {receipt.lines.map((line) => (
            <div key={line.id} className="space-y-1 rounded-md border border-border p-3 text-sm">
              <p className="font-medium text-foreground">
                {line.variant ? `${line.variant.name} (${line.variant.code})` : 'Variante no disponible'}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <p>Pagados: <span className="text-foreground">{line.ordered_packages}</span></p>
                <p>Recibidos: <span className="text-foreground">{line.received_packages}</span></p>
                <p>Bonificación: <span className="text-foreground">{line.bonus_packages}</span></p>
                <p>Factor de presentación: <span className="text-foreground">×{line.presentation_factor}</span></p>
                <p>Unidades base recibidas: <span className="text-foreground">{line.base_units_received}</span></p>
                <p>Monto neto: <span className="text-foreground">{formatCurrency(line.net_acquisition_amount)}</span></p>
                <p className="col-span-2">
                  Costo unitario efectivo: <span className="font-semibold text-foreground">{formatCurrency(line.effective_unit_cost)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {isPosted && receipt.posted_at && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
            <p>Confirmada el {new Date(receipt.posted_at).toLocaleString('es-MX')}{receipt.posted_by ? ` por ${receipt.posted_by.name}` : ''}.</p>
            <p className="mt-1">Esta recepción ya aplicó su costo e inventario y no puede editarse. Puede revertirse si fue un error.</p>
          </div>
        )}

        {receipt.status === 'REVERSED' && receipt.reversed_at && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <p>Revertida el {new Date(receipt.reversed_at).toLocaleString('es-MX')}{receipt.reversed_by ? ` por ${receipt.reversed_by.name}` : ''}.</p>
            {receipt.reversal_reason && <p className="mt-1">Motivo: {receipt.reversal_reason}</p>}
          </div>
        )}
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-between">
          {isDraft && (
            <CanAccess permission="receipts.manage">
              <Button variant="outline-danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </CanAccess>
          )}
          {isPosted && (
            <CanAccess permission="receipts.manage">
              <Button variant="outline" onClick={openReverseConfirm}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Revertir
              </Button>
            </CanAccess>
          )}
          {isDraft && (
            <div className="flex gap-3">
              <CanAccess permission="receipts.manage">
                <Button variant="outline" onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </CanAccess>
              <CanAccess permission="receipts.manage">
                <Button onClick={() => setShowPostConfirm(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar recepción
                </Button>
              </CanAccess>
            </div>
          )}
        </div>
      </SlidePanel.Footer>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { onDelete(); setShowDeleteConfirm(false) }}
        title="Eliminar recepción"
        description="¿Confirmas que deseas eliminar este borrador de recepción? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        onConfirm={() => { onPost(); setShowPostConfirm(false) }}
        title="Confirmar recepción"
        description="Al confirmar, esta recepción aplicará el costo efectivo y aumentará el inventario en la ubicación destino. No podrá editarse después."
        confirmLabel="Confirmar"
        variant="info"
        isLoading={isPosting}
      />

      <ConfirmDialog
        isOpen={showReverseConfirm}
        onClose={() => setShowReverseConfirm(false)}
        onConfirm={() => { onReverse(reverseReason); setShowReverseConfirm(false) }}
        title="Revertir recepción"
        description={
          <div className="space-y-3">
            <p>¿Confirmas que deseas revertir esta recepción? Se descontará del inventario lo que se había recibido.</p>
            <div className="space-y-1">
              <label htmlFor="reverse_reason" className="text-xs font-medium text-foreground">
                Motivo <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="reverse_reason"
                placeholder="Ej: Recepción registrada por error"
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
