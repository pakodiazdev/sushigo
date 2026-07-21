import { Loader2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormField, Textarea } from '@/components/ui/form-fields'
import { MultiDateCalendar } from '@/components/ui/multi-date-calendar'
import { formatLastFirst } from '@/lib/format'
import { useAuthStore } from '@/stores/auth.store'
import { DialogFrame } from './dialog-frame'
import { useDialogShell } from './use-dialog-shell'
import { useRegisterVacationRequestDialog } from './use-register-vacation-request-dialog'
import type { RegisterVacationRequestEmployee } from './use-register-vacation-request-dialog'

// ── Props ───────────────────────────────────────────────────────────────────────

export interface RegisterVacationRequestDialogProps {
  isOpen: boolean
  employee: RegisterVacationRequestEmployee | null
  onClose: () => void
}

// ── Component ───────────────────────────────────────────────────────────────────

export function RegisterVacationRequestDialog({
  isOpen,
  employee,
  onClose,
}: Readonly<RegisterVacationRequestDialogProps>) {
  const {
    form,
    daysCount,
    remainingDays,
    isInsufficientBalance,
    isPending,
    handleSubmit,
    handleClose,
  } = useRegisterVacationRequestDialog({
    employee,
    onSuccess: onClose,
  })

  const { register, control, formState: { errors } } = form

  const { can } = useAuthStore()
  const willAutoApprove = can('vacation-requests.approve')

  const { visible, backdropCls, panelCls, close } = useDialogShell(isOpen, isPending, handleClose, onClose)

  if (!visible) return null

  const employeeName = formatLastFirst(employee?.user)

  const content = (
    <DialogFrame
      backdropCls={backdropCls}
      panelCls={panelCls}
      dialogId="register-vacation-request-title"
      onBackdropClick={close}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-6 py-4">
        <div>
          <h3
            id="register-vacation-request-title"
            className="text-base font-semibold text-foreground"
          >
            Programar vacaciones
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{employeeName}</p>
          {willAutoApprove ? (
            <p className="mt-0.5 text-xs text-emerald-600">Se registrará como aprobada de inmediato</p>
          ) : (
            <p className="mt-0.5 text-xs text-amber-600">Solicitud — requiere aprobación</p>
          )}
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
          label="Días de vacaciones"
          error={errors.dates?.message}
          required
        >
          <Controller
            name="dates"
            control={control}
            render={({ field }) => (
              <MultiDateCalendar value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        {daysCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {daysCount} {daysCount === 1 ? 'día solicitado' : 'días solicitados'}
            {remainingDays !== null && <> · Saldo disponible: {remainingDays}</>}
          </p>
        )}

        {isInsufficientBalance && (
          <p className="text-sm text-destructive">
            El empleado no tiene saldo suficiente para las fechas seleccionadas.
          </p>
        )}

        {/* Notes */}
        <FormField
          label="Notas"
          error={errors.notes?.message}
        >
          <Textarea
            placeholder="Motivo, observaciones..."
            disabled={isPending}
            {...register('notes')}
            error={!!errors.notes}
          />
        </FormField>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="neutral"
            onClick={close}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="warning"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {willAutoApprove ? 'Registrar vacaciones' : 'Programar vacaciones'}
          </Button>
        </div>
      </form>
    </DialogFrame>
  )

  return createPortal(content, document.body)
}
