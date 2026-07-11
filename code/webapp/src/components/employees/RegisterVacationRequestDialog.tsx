import { Loader2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormField, Textarea } from '@/components/ui/form-fields'
import { MultiDateCalendar } from '@/components/ui/multi-date-calendar'
import { useAuthStore } from '@/stores/auth.store'
import { useRegisterVacationRequestDialog } from './use-register-vacation-request-dialog'
import type { RegisterVacationRequestEmployee } from './use-register-vacation-request-dialog'

function getAnimationClass(
  state: 'enter' | 'exit' | null,
  enterClass: string,
  exitClass: string,
): string {
  if (state === 'enter') return enterClass
  if (state === 'exit') return exitClass
  return ''
}

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
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

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

  // Animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating('enter'))
      })
    } else if (visible) {
      setAnimating('exit')
      const timer = setTimeout(() => {
        setVisible(false)
        setAnimating(null)
        handleClose()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible, handleClose])

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, isPending, onClose])

  if (!visible) return null

  const backdropAnim = getAnimationClass(animating, 'animate-dialog-backdrop-in', 'animate-dialog-backdrop-out')
  const panelAnim = getAnimationClass(animating, 'animate-dialog-in', 'animate-dialog-out')

  const employeeName = employee
    ? `${employee.last_name}, ${employee.first_name}`
    : ''

  const content = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${backdropAnim} cursor-default appearance-none border-none p-0`}
        onClick={() => { if (!isPending) onClose() }}
        aria-label="Cerrar diálogo"
      />

      {/* Dialog */}
      <dialog
        ref={dialogRef}
        open
        aria-labelledby="register-vacation-request-title"
        className={`relative z-10 w-full max-w-lg rounded-lg border border-border bg-background shadow-xl ${panelAnim}`}
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
            onClick={onClose}
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
              onClick={onClose}
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
              {willAutoApprove ? 'Registrar vacaciones' : 'Programar vacaciones'}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}
