import { Loader2 } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormField, Textarea } from '@/components/ui/form-fields'
import { MultiDateCalendar } from '@/components/ui/multi-date-calendar'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useAuthStore } from '@/stores/auth.store'
import { useVacationRequestForm } from './use-vacation-request-form'

interface VacationRequestFormProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly employeeId: string
}

export function VacationRequestForm({ isOpen, onClose, employeeId }: VacationRequestFormProps) {
  const {
    form,
    daysCount,
    remainingDays,
    isInsufficientBalance,
    isPending,
    handleSubmit,
  } = useVacationRequestForm(employeeId, onClose)

  const { register, control, formState: { errors } } = form
  const { can } = useAuthStore()
  const willAutoApprove = can('vacation-requests.approve')

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <SlidePanel isOpen={isOpen} onClose={handleClose} title="Solicitar vacaciones" size="sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Days */}
        <FormField label="Días" error={errors.dates?.message} required>
          <Controller
            name="dates"
            control={control}
            render={({ field }) => (
              <MultiDateCalendar value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
        <p className="-mt-4 text-xs text-muted-foreground">Los días no tienen que ser consecutivos</p>

        {daysCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {daysCount} {daysCount === 1 ? 'día solicitado' : 'días solicitados'}
            {remainingDays !== null && <> · Saldo disponible: {remainingDays}</>}
          </p>
        )}

        {isInsufficientBalance && (
          <p className="text-sm text-destructive">
            No tienes saldo de vacaciones suficiente para los días seleccionados.
          </p>
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
        {willAutoApprove ? (
          <p className="text-sm text-muted-foreground border border-border rounded-md p-3 bg-muted/30">
            ✅ Tu solicitud se aprobará de inmediato
          </p>
        ) : (
          <p className="text-sm text-muted-foreground border border-border rounded-md p-3 bg-muted/30">
            ⚠️ Esta solicitud requiere aprobación del Manager
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </div>
      </form>
    </SlidePanel>
  )
}
