import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useExtraDayForm } from './use-extra-day-form'
import type { Employee } from '@/types/employee'

interface ExtraDayFormProps {
  isOpen: boolean
  onClose: () => void
  employee: Employee
}

function formatCurrency(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
}

export function ExtraDayForm({ isOpen, onClose, employee }: ExtraDayFormProps) {
  const employeeName = `${employee.first_name} ${employee.last_name}`

  const {
    form,
    isLoadingWages,
    hasNoWage,
    registeredDailyWage,
    salaryDay,
    seventhDay,
    prima,
    total,
    handleSubmit,
    isPending,
  } = useExtraDayForm(employee.id, onClose)

  const { register, watch, setValue, formState: { errors } } = form
  const salaryType = watch('salary_type')
  const primaType = watch('prima_type')

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Registrar día extra — ${employeeName}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <FormField label="Fecha" required error={errors.date?.message}>
          <Input type="date" {...register('date')} />
        </FormField>

        {/* Salary */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Salario del día</p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              value="registered"
              checked={salaryType === 'registered'}
              onChange={() => { setValue('salary_type', 'registered'); setValue('salary_pct', 100) }}
              className="h-4 w-4 text-primary"
            />
            <span className="flex-1 text-sm">Salario registrado</span>
            {isLoadingWages ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-sm font-medium">{formatCurrency(registeredDailyWage)}</span>
            )}
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              value="custom"
              checked={salaryType === 'custom'}
              onChange={() => setValue('salary_type', 'custom')}
              className="h-4 w-4 mt-0.5 text-primary"
            />
            <div className="flex-1 space-y-2">
              <span className="text-sm">Salario acordado</span>
              {salaryType === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    className="w-24"
                    {...register('salary_pct', { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm text-muted-foreground">=</span>
                  <span className="text-sm font-medium w-24 text-right">{formatCurrency(salaryDay)}</span>
                  {errors.salary_pct && (
                    <p className="text-xs text-red-600">{errors.salary_pct.message}</p>
                  )}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Prima */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Prima por día de descanso trabajado</p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              value="legal"
              checked={primaType === 'legal'}
              onChange={() => { setValue('prima_type', 'legal'); setValue('prima_pct', 100) }}
              className="h-4 w-4 text-primary"
            />
            <span className="flex-1 text-sm">Prima legal &nbsp; 100%</span>
            <span className="text-sm font-medium">{formatCurrency(salaryDay)}</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              value="custom"
              checked={primaType === 'custom'}
              onChange={() => setValue('prima_type', 'custom')}
              className="h-4 w-4 mt-0.5 text-primary"
            />
            <div className="flex-1 space-y-2">
              <span className="text-sm">Prima acordada</span>
              {primaType === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    className="w-24"
                    {...register('prima_pct', { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm text-muted-foreground">=</span>
                  <span className="text-sm font-medium w-24 text-right">{formatCurrency(prima)}</span>
                  {errors.prima_pct && (
                    <p className="text-xs text-red-600">{errors.prima_pct.message}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">0% mínimo · 200% máximo</p>
            </div>
          </label>
        </div>

        {/* Summary */}
        <div className="rounded-md border border-border bg-muted/40 p-4 space-y-1.5">
          <p className="text-sm font-semibold text-foreground mb-2">Resumen del día</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Salario del día</span>
            <span>{formatCurrency(salaryDay)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Séptimo día (1/6)</span>
            <span>{formatCurrency(seventhDay)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prima</span>
            <span>{formatCurrency(prima)}</span>
          </div>
          <hr className="border-border my-1" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <FormField label="Notas (opcional)" error={errors.notes?.message}>
          <Textarea
            placeholder="Ej. Acuerdo verbal del lunes"
            rows={3}
            {...register('notes')}
          />
        </FormField>

        {/* No wage warning */}
        {hasNoWage && (
          <p className="text-sm text-red-600">
            Este empleado no tiene historial de salario registrado. No es posible registrar un día extra.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending || isLoadingWages || hasNoWage}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar acuerdo
          </Button>
        </div>
      </form>
    </SlidePanel>
  )
}
