import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useLeaveRequestForm } from './use-leave-request-form'

interface LeaveRequestFormProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly employeeId: string
}

export function LeaveRequestForm({ isOpen, onClose, employeeId }: LeaveRequestFormProps) {
  const {
    form,
    leaveTypes,
    isLoadingTypes,
    isProportionalHours,
    isScheduled,
    isPending,
    handleSubmit,
  } = useLeaveRequestForm(employeeId, onClose)

  const { register, formState: { errors } } = form

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <SlidePanel isOpen={isOpen} onClose={handleClose} title="Solicitar permiso" size="sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave type */}
        <FormField label="Tipo de ausencia" error={errors.leave_type_id?.message} required>
          <Select
            {...register('leave_type_id', { valueAsNumber: true })}
            disabled={isLoadingTypes || isPending}
            error={!!errors.leave_type_id}
          >
            <option value={0}>{isLoadingTypes ? 'Cargando...' : 'Selecciona un tipo'}</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
          </Select>
        </FormField>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fecha de inicio" error={errors.start_date?.message} required>
            <input
              type="date"
              disabled={isPending}
              {...register('start_date')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </FormField>
          <FormField label="Fecha de fin" error={errors.end_date?.message} required>
            <input
              type="date"
              disabled={isPending || isProportionalHours}
              {...register('end_date')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </FormField>
        </div>
        {isProportionalHours && (
          <p className="-mt-4 text-xs text-muted-foreground">Los permisos por horas son de un solo día</p>
        )}

        {/* Pay percentage override */}
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
            <FormField label="Modo de horario" error={errors.time_mode?.message} required>
              <Select {...register('time_mode')} disabled={isPending} error={!!errors.time_mode}>
                <option value="">Selecciona un modo</option>
                <option value="SCHEDULED">Horario definido (hr salida y regreso)</option>
                <option value="OPEN_ENDED">Sin hora de regreso</option>
              </Select>
            </FormField>

            <FormField label="Hora de salida" error={errors.scheduled_start_time?.message} required>
              <input
                type="time"
                disabled={isPending}
                {...register('scheduled_start_time')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </FormField>

            {isScheduled && (
              <FormField label="Hora de regreso programado" error={errors.scheduled_end_time?.message} required>
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
        <FormField label="Nota para el Manager (opcional)" error={errors.notes?.message}>
          <Textarea
            placeholder="Motivo, observaciones..."
            rows={3}
            disabled={isPending}
            {...register('notes')}
            error={!!errors.notes}
          />
        </FormField>

        {/* Warning */}
        <p className="text-sm text-muted-foreground border border-border rounded-md p-3 bg-muted/30">
          ⚠️ Esta solicitud requiere aprobación del Manager
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || isLoadingTypes}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </div>
      </form>
    </SlidePanel>
  )
}
