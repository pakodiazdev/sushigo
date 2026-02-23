import { Calculator } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { useWageCalculations } from './use-wage-calculations'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
    }).format(amount)
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface WageSummaryProps {
    weeklySalary: number
    weeklyHours: number
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WageSummary({ weeklySalary, weeklyHours }: WageSummaryProps) {
    const calculations = useWageCalculations({ weeklySalary, weeklyHours })

    if (!calculations) {
        return null
    }

    return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
            <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Desglose de tu sueldo semanal
                </span>
                <InfoTooltip text="El sueldo semanal se divide en porción de trabajo (6 días) y día de descanso. Ambas partes conforman el salario ordinario." />
            </div>

            <div className="space-y-3 text-sm">
                {/* Desglose semanal */}
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Por 6 días de trabajo ({weeklyHours} hrs):
                        </span>
                        <span className="font-medium">{formatCurrency(calculations.weeklyWorkPortion)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1">
                            Por día de descanso semanal:
                            <InfoTooltip text="Es la parte proporcional del salario semanal que corresponde al día de descanso. No es un bono ni prestación extra; forma parte del salario ordinario." />
                        </span>
                        <span className="font-medium">{formatCurrency(calculations.weeklyRestPortion)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-emerald-300 dark:border-emerald-700 pt-1">
                        <span>Total semanal acordado:</span>
                        <span>{formatCurrency(calculations.weeklyTotal)}</span>
                    </div>
                </div>

                {/* Salario diario y por hora */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            Salario diario
                            <InfoTooltip text="Es el salario semanal dividido entre 7 días. Se usa para calcular incidencias, IMSS y prestaciones de ley." />
                        </p>
                        <p className="font-medium">{formatCurrency(calculations.dailySalary)}</p>
                        <p className="text-xs text-muted-foreground">(semanal ÷ 7)</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            Tarifa por hora
                            <InfoTooltip text="Valor de referencia para prorratear asistencia, faltas o retardos. El salario formal se basa en el sueldo semanal o diario, no en esta tarifa." />
                        </p>
                        <p className="font-medium">{formatCurrency(calculations.hourlyRatePrecise)}</p>
                        <p className="text-xs text-muted-foreground">(trabajo ÷ {weeklyHours} hrs)</p>
                    </div>
                </div>

                {/* Proyecciones */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Proyección mensual</p>
                        <p className="font-medium">{formatCurrency(calculations.monthlyTotal)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Proyección anual</p>
                        <p className="font-medium">{formatCurrency(calculations.annualTotal)}</p>
                    </div>
                </div>

                {/* Cálculos LFT */}
                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1">
                        Prestaciones de ley (año 1)
                        <InfoTooltip text="Cálculo estimado con base en aguinaldo (15 días) y prima vacacional (12 días × 25%) según la LFT." />
                    </p>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Aguinaldo (15 días):</span>
                            <span className="font-medium">{formatCurrency(calculations.aguinaldoAnnual)}/año</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Prima vacacional (12 días × 25%):</span>
                            <span className="font-medium">{formatCurrency(calculations.primaVacacionalAnnual)}/año</span>
                        </div>
                    </div>
                </div>

                {/* SDI */}
                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900 -mx-3 px-3 pb-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                Salario Diario Integrado (SDI)
                                <InfoTooltip text="Incluye salario diario más la parte proporcional de aguinaldo y prima vacacional. Se usa para calcular cuotas IMSS e Infonavit." />
                            </p>
                            <p className="text-xs text-muted-foreground">Factor de integración: {calculations.factorIntegracion.toFixed(4)}</p>
                        </div>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(calculations.sdi)}
                        </span>
                    </div>
                </div>

                {/* Deducciones del trabajador */}
                <div className="pt-2 border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 -mx-3 px-3 pb-2">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                        📋 Deducciones del trabajador (estimadas)
                        <InfoTooltip text="Retenciones obligatorias que se descuentan del salario bruto: IMSS trabajador e ISR. El cálculo es aproximado y puede variar según situación fiscal." />
                    </p>

                    <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">IMSS trabajador (~2.38%):</span>
                            <span className="text-red-600 dark:text-red-400">-{formatCurrency(calculations.imssEmpleadoSemanal)}/sem</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">ISR (según tabla):</span>
                            <span className="text-red-600 dark:text-red-400">-{formatCurrency(calculations.isrBrutoSemanal)}/sem</span>
                        </div>
                        {calculations.subsidioEmpleoSemanal > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Subsidio al empleo:</span>
                                <span className="text-green-600 dark:text-green-400">+{formatCurrency(calculations.subsidioEmpleoSemanal)}/sem</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs font-medium border-t border-red-200 dark:border-red-800 pt-1">
                            <span>ISR neto a retener:</span>
                            <span className="text-red-600 dark:text-red-400">-{formatCurrency(calculations.isrNetoSemanal)}/sem</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold border-t border-red-200 dark:border-red-800 pt-1">
                            <span>Total deducciones:</span>
                            <span className="text-red-600 dark:text-red-400">-{formatCurrency(calculations.totalDeduccionesSemanal)}/sem</span>
                        </div>
                    </div>

                    {/* Sueldo neto */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-red-200 dark:border-red-800">
                        <div className="text-center p-2 bg-green-100 dark:bg-green-900 rounded">
                            <p className="text-xs text-muted-foreground">Neto semanal</p>
                            <p className="text-sm font-bold text-green-700 dark:text-green-300">
                                {formatCurrency(calculations.sueldoNetoSemanal)}
                            </p>
                        </div>
                        <div className="text-center p-2 bg-green-100 dark:bg-green-900 rounded">
                            <p className="text-xs text-muted-foreground">Neto mensual</p>
                            <p className="text-sm font-bold text-green-700 dark:text-green-300">
                                {formatCurrency(calculations.sueldoNetoMensual)}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                        Lo que el trabajador recibirá después de deducciones
                    </p>
                </div>

                {/* Costo para la empresa */}
                <div className="pt-2 border-t border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 -mx-3 -mb-3 px-3 pb-3 rounded-b-lg">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                        💼 Costo estimado para la empresa
                        <InfoTooltip text="Incluye salario, prestaciones de ley y cuotas patronales (IMSS, Infonavit, SAR). Son valores aproximados; el costo real puede variar según riesgo de trabajo y topes de cotización." />
                    </p>

                    {/* Cuotas patronales desglosadas */}
                    <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">IMSS patrón (~20.45%):</span>
                            <span>{formatCurrency(calculations.imssPatronMensual)}/mes</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Infonavit (5%):</span>
                            <span>{formatCurrency(calculations.infonavitMensual)}/mes</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Retiro + Cesantía (5.15%):</span>
                            <span>{formatCurrency(calculations.retiroCesantiaMensual)}/mes</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium border-t border-amber-200 dark:border-amber-800 pt-1">
                            <span>Total cuotas patronales (~{calculations.porcentajeCuotasPatronales.toFixed(1)}%):</span>
                            <span>{formatCurrency(calculations.totalCuotasPatronalesMensual)}/mes</span>
                        </div>
                    </div>

                    {/* Totales para la empresa */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                        <div className="text-center p-2 bg-amber-100 dark:bg-amber-900 rounded">
                            <p className="text-xs text-muted-foreground">Por día</p>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                {formatCurrency(calculations.costoDiarioEmpresa)}
                            </p>
                        </div>
                        <div className="text-center p-2 bg-amber-100 dark:bg-amber-900 rounded">
                            <p className="text-xs text-muted-foreground">Por semana</p>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                {formatCurrency(calculations.costoSemanalEmpresa)}
                            </p>
                        </div>
                        <div className="text-center p-2 bg-amber-100 dark:bg-amber-900 rounded">
                            <p className="text-xs text-muted-foreground">Por mes</p>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                {formatCurrency(calculations.costoMensualEmpresa)}
                            </p>
                        </div>
                        <div className="text-center p-2 bg-amber-100 dark:bg-amber-900 rounded">
                            <p className="text-xs text-muted-foreground">Por año</p>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                {formatCurrency(calculations.costoAnualEmpresa)}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                        Incluye salario + cuotas patronales + prestaciones (aguinaldo y prima vacacional)
                    </p>
                </div>
            </div>
        </div>
    )
}
