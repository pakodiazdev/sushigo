import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Info, AlertCircle } from 'lucide-react'
import { useCreateWage } from '@/services/employee-hooks'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { WageSummary } from './wage-summary'
import { useWageForm } from './use-wage-form'

// ─── Props ───────────────────────────────────────────────────────────────────

interface RegisterWageFormProps {
    employeeId: string
    onSuccess: () => void
    onCancel: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RegisterWageForm({ employeeId, onSuccess, onCancel }: RegisterWageFormProps) {
    const createWage = useCreateWage()

    const {
        formData,
        weeklySalaryBruto,
        weeklySalaryNeto,
        dailySalary,
        activeInput,
        errors,
        weeklySalaryError,
        handleBrutoChange,
        handleNetoChange,
        handleDailySalaryChange,
        handleHourlyRateChange,
        handleWeeklyHoursChange,
        handleEffectiveFromChange,
        handleNotesChange,
        validate,
        getSubmitData,
    } = useWageForm()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        try {
            await createWage.mutateAsync({
                employeeId,
                data: getSubmitData(),
            })
            onSuccess()
        } catch {
            // Error ya manejado por el hook
        }
    }

    return (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Registrar nuevo salario</h4>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Sueldo semanal BRUTO, NETO y DIARIO - campos sincronizados */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Input Bruto Semanal */}
                        <div className="space-y-1">
                            <Label className="block flex items-center gap-1">
                                Bruto semanal
                                <InfoTooltip text="Salario antes de deducciones (IMSS e ISR). Incluye el día de descanso semanal." />
                            </Label>
                            <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={weeklySalaryBruto || ''}
                                onChange={(e) => handleBrutoChange(parseFloat(e.target.value) || 0)}
                                className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm ${weeklySalaryError ? 'border-red-500' : 'border-input'
                                    } ${activeInput === 'bruto' ? 'ring-2 ring-blue-500' : ''}`}
                                placeholder="2,400"
                            />
                            <p className="text-xs text-muted-foreground">
                                Antes de descuentos
                            </p>
                        </div>

                        {/* Input Salario Diario */}
                        <div className="space-y-1">
                            <Label className="block flex items-center gap-1">
                                Salario diario
                                <InfoTooltip text="Salario bruto dividido entre 7 días. Base para cálculos de IMSS, prestaciones e incidencias." />
                            </Label>
                            <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={dailySalary || ''}
                                onChange={(e) => handleDailySalaryChange(parseFloat(e.target.value) || 0)}
                                className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm border-input ${activeInput === 'diario' ? 'ring-2 ring-purple-500' : ''
                                    }`}
                                placeholder="342.86"
                            />
                            <p className="text-xs text-muted-foreground">
                                (semanal ÷ 7)
                            </p>
                        </div>

                        {/* Input Neto Semanal */}
                        <div className="space-y-1">
                            <Label className="block flex items-center gap-1">
                                Neto semanal
                                <InfoTooltip text="Lo que el trabajador recibirá en mano después de descuentos de IMSS e ISR." />
                            </Label>
                            <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={weeklySalaryNeto || ''}
                                onChange={(e) => handleNetoChange(parseFloat(e.target.value) || 0)}
                                className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm border-input ${activeInput === 'neto' ? 'ring-2 ring-green-500' : ''
                                    }`}
                                placeholder="2,100"
                            />
                            <p className="text-xs text-muted-foreground">
                                En mano
                            </p>
                        </div>
                    </div>
                    {weeklySalaryError && (
                        <p className="text-xs text-red-600 flex items-center gap-1 -mt-2">
                            <AlertCircle className="h-3 w-3" />
                            {weeklySalaryError}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground -mt-1">
                        Edita cualquiera de los tres y los demás se calcularán automáticamente.
                    </p>

                    {/* Jornada semanal (horas) */}
                    <div className="space-y-1">
                        <Label className="block flex items-center gap-1">
                            Jornada semanal (horas)
                            <InfoTooltip text="Horas que el colaborador tiene programadas por semana. Se usan para calcular la tarifa por hora y prorratear incidencias como faltas o retardos." />
                        </Label>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            step="0.001"
                            value={formData.weekly_scheduled_hours}
                            onChange={(e) => handleWeeklyHoursChange(parseFloat(e.target.value) || 0)}
                            className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm ${errors.weekly_scheduled_hours ? 'border-red-500' : 'border-input'
                                }`}
                        />
                        {errors.weekly_scheduled_hours ? (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.weekly_scheduled_hours}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Puede variar según el horario del colaborador (ej. medio tiempo, completo).
                            </p>
                        )}
                    </div>

                    {/* Tarifa por hora (referencia) */}
                    <div className="space-y-1">
                        <Label className="block flex items-center gap-1">
                            Tarifa por hora (referencia)
                            <InfoTooltip text="No es el salario formal. Solo se usa internamente para calcular descuentos o pagos proporcionales por incidencias de asistencia." />
                        </Label>
                        <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={formData.hourly_rate || ''}
                            onChange={(e) => handleHourlyRateChange(parseFloat(e.target.value) || 0)}
                            className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm ${errors.hourly_rate ? 'border-red-500' : 'border-input'
                                }`}
                            placeholder="0.00"
                        />
                        {errors.hourly_rate ? (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.hourly_rate}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Se calcula automáticamente. Puedes editarlo si necesitas ajustarlo.
                            </p>
                        )}
                    </div>

                    {/* Proyección de ingresos */}
                    <WageSummary
                        weeklySalary={weeklySalaryBruto}
                        weeklyHours={formData.weekly_scheduled_hours}
                    />

                    {/* Fecha de inicio */}
                    <div className="space-y-1">
                        <Label className="block">Fecha de inicio</Label>
                        <input
                            type="date"
                            value={formData.effective_from}
                            onChange={(e) => handleEffectiveFromChange(e.target.value)}
                            className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm ${errors.effective_from ? 'border-red-500' : 'border-input'
                                }`}
                        />
                        {errors.effective_from && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.effective_from}
                            </p>
                        )}
                    </div>

                    {/* Observaciones */}
                    <div className="space-y-1">
                        <Label className="block">Observaciones (opcional)</Label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                            rows={2}
                            placeholder="Ej: Aumento por promoción, ajuste anual, etc."
                        />
                    </div>

                    {/* Disclaimer */}
                    <div className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 rounded p-2 flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                            El día de descanso semanal está incluido conforme a la LFT. La tarifa por hora es solo referencia para control de asistencia.
                        </span>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            onClick={onCancel}
                            disabled={createWage.isPending}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="info"
                            size="sm"
                            disabled={createWage.isPending}
                            className="text-xs"
                        >
                            {createWage.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Guardar Salario
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
