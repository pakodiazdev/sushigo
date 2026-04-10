import { Loader2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { useRegisterLeaveDialog } from './use-register-leave-dialog'
import type { TodayAttendanceEmployee } from '@/types/attendance'

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

export interface RegisterLeaveDialogProps {
  isOpen: boolean
  employee: TodayAttendanceEmployee | null
  onClose: () => void
}

// ── Component ───────────────────────────────────────────────────────────────────

export function RegisterLeaveDialog({
  isOpen,
  employee,
  onClose,
}: Readonly<RegisterLeaveDialogProps>) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const {
    form,
    leaveTypes,
    isLoadingTypes,
    isProportionalHours,
    isScheduled,
    isPending,
    handleSubmit,
    handleClose,
  } = useRegisterLeaveDialog({
    employee,
    onSuccess: onClose,
  })

  const { register, formState: { errors } } = form

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
      <div
        role="button"
        tabIndex={0}
        className={`absolute inset-0 bg-black/50 ${backdropAnim}`}
        onClick={() => { if (!isPending) onClose() }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !isPending) onClose() }}
        aria-label="Cerrar diálogo"
      />

      {/* Dialog */}
      <dialog
        ref={dialogRef}
        open
        aria-labelledby="register-leave-title"
        className={`relative z-10 w-full max-w-lg rounded-lg border border-border bg-background shadow-xl ${panelAnim}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-border px-6 py-4">
          <div>
            <h3
              id="register-leave-title"
              className="text-base font-semibold text-foreground"
            >
              Registrar ausencia
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{employeeName}</p>
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
          {/* Leave type selector */}
          <FormField
            label="Tipo de ausencia"
            error={errors.leave_type_id?.message}
            required
          >
            <Select
              {...register('leave_type_id', { valueAsNumber: true })}
              disabled={isLoadingTypes || isPending}
              error={!!errors.leave_type_id}
            >
              <option value={0}>
                {isLoadingTypes ? 'Cargando...' : 'Selecciona un tipo'}
              </option>
              {leaveTypes?.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Pay percentage override (always available, optional) */}
          <FormField
            label="% de pago (opcional)"
            error={errors.pay_percentage?.message}
            hint="Deja en blanco para usar el % predeterminado del tipo"
          >
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              placeholder="Ej. 50"
              disabled={isPending}
              {...register('pay_percentage')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </FormField>

          {/* PROPORTIONAL_HOURS fields */}
          {isProportionalHours && (
            <>
              <FormField
                label="Modo de horario"
                error={errors.time_mode?.message}
                required
              >
                <Select
                  {...register('time_mode')}
                  disabled={isPending}
                  error={!!errors.time_mode}
                >
                  <option value="">Selecciona un modo</option>
                  <option value="SCHEDULED">Horario definido (hr salida y regreso)</option>
                  <option value="OPEN_ENDED">Sin hora de regreso</option>
                </Select>
              </FormField>

              {/* Scheduled start time — shown when any time_mode is selected */}
              <FormField
                label="Hora de salida"
                error={errors.scheduled_start_time?.message}
                required
              >
                <input
                  type="time"
                  disabled={isPending}
                  {...register('scheduled_start_time')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              </FormField>

              {/* Scheduled end time — only when SCHEDULED */}
              {isScheduled && (
                <FormField
                  label="Hora de regreso programado"
                  error={errors.scheduled_end_time?.message}
                  required
                >
                  <input
                    type="time"
                    disabled={isPending}
                    {...register('scheduled_end_time')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  />
                </FormField>
              )}
            </>
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
              Registrar ausencia
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}
