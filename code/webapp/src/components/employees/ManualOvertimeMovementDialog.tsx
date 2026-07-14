import { Loader2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { Input } from '@/components/ui/input'
import { useDialogAnimation } from './use-dialog-animation'
import { useManualOvertimeMovementDialog } from './use-manual-overtime-movement-dialog'
import type { ManualOvertimeMovementEmployee } from './use-manual-overtime-movement-dialog'

// ── Props ───────────────────────────────────────────────────────────────────────

export interface ManualOvertimeMovementDialogProps {
  isOpen: boolean
  employee: ManualOvertimeMovementEmployee | null
  onClose: () => void
}

// ── Component ───────────────────────────────────────────────────────────────────

export function ManualOvertimeMovementDialog({
  isOpen,
  employee,
  onClose,
}: Readonly<ManualOvertimeMovementDialogProps>) {
  const { form, isPending, handleSubmit, handleClose } = useManualOvertimeMovementDialog({
    employee,
    onSuccess: onClose,
  })

  const { register, formState: { errors } } = form

  const close = () => {
    if (isPending) return
    handleClose()
    onClose()
  }

  const { visible, backdropCls, panelCls } = useDialogAnimation(isOpen, close)

  if (!visible) return null

  const employeeName = employee
    ? `${employee.last_name}, ${employee.first_name}`
    : ''

  const content = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${backdropCls} cursor-default appearance-none border-none p-0`}
        onClick={close}
        aria-label="Cerrar diálogo"
      />

      {/* Dialog */}
      <dialog
        open
        aria-labelledby="manual-overtime-movement-title"
        className={`relative z-10 w-full max-w-lg rounded-lg border border-border bg-background shadow-xl ${panelCls}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-border px-6 py-4">
          <div>
            <h3
              id="manual-overtime-movement-title"
              className="text-base font-semibold text-foreground"
            >
              Movimiento manual
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{employeeName}</p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={isPending}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <FormField
            label="Tipo de movimiento"
            error={errors.movement_type?.message}
            required
          >
            <Select {...register('movement_type')} error={!!errors.movement_type} disabled={isPending}>
              <option value="USED">Usado</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </Select>
          </FormField>

          <FormField
            label="Fecha"
            error={errors.date?.message}
            required
          >
            <Input type="date" disabled={isPending} {...register('date')} error={!!errors.date} />
          </FormField>

          <FormField
            label="Minutos"
            error={errors.minutes?.message}
            hint="Para un ajuste negativo, ingresa un número negativo"
            required
          >
            <Input
              type="number"
              step={1}
              disabled={isPending}
              {...register('minutes', { valueAsNumber: true })}
              error={!!errors.minutes}
            />
          </FormField>

          <FormField
            label="Motivo"
            error={errors.reason?.message}
            required
          >
            <Textarea
              placeholder="Motivo del movimiento..."
              disabled={isPending}
              {...register('reason')}
              error={!!errors.reason}
            />
          </FormField>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              onClick={close}
              disabled={isPending}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar movimiento
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}
