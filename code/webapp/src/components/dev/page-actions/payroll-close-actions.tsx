import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { seedPayrollAttendance, type SeedScenario, type SeedPayrollResult } from '@/services/payroll-devtools.service'
import { getApiErrorMessage } from '@/lib/api-error'

function currentWeekRange(): { start: string; end: string } {
    const today = new Date()
    const day = today.getDay() // 0 = Sun
    const diffToMon = day === 0 ? -6 : 1 - day
    const mon = new Date(today)
    mon.setDate(today.getDate() + diffToMon)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { start: fmt(mon), end: fmt(sun) }
}

const SCENARIOS: { value: SeedScenario; label: string }[] = [
    { value: 'full_week',         label: 'Semana completa (L–V, puntual)' },
    { value: 'with_lates',        label: 'Con retardos (L y Mi, 35 min)' },
    { value: 'with_unpaid_leave', label: 'Con permiso no pagado (Ju, medio día)' },
    { value: 'with_overtime',     label: 'Con horas extra pagadas (Ma, Ju, Vi)' },
    { value: 'with_absences',     label: 'Con faltas (Ma y Ju)' },
    { value: 'mixed',             label: '★ Variado — cada empleado distinto' },
]

export function PayrollCloseActions() {
    const defaultRange = currentWeekRange()
    const [periodStart, setPeriodStart] = useState(defaultRange.start)
    const [periodEnd, setPeriodEnd]     = useState(defaultRange.end)
    const [scenario, setScenario]       = useState<SeedScenario>('full_week')
    const [result, setResult]           = useState<SeedPayrollResult | null>(null)
    const [error, setError]             = useState<string | null>(null)

    const currentBranch = useAuthStore((s) => s.currentBranch)
    const queryClient   = useQueryClient()

    const { mutate, isPending } = useMutation({
        mutationFn: () =>
            seedPayrollAttendance({
                branch_id:    currentBranch?.id ?? 1,
                period_start: periodStart,
                period_end:   periodEnd,
                scenario,
            }),
        onSuccess: (data) => {
            setResult(data)
            setError(null)
            queryClient.invalidateQueries({ queryKey: ['payroll', 'preview'] })
        },
        onError: (err: unknown) => {
            setError(getApiErrorMessage(err, 'Error al generar asistencias'))
            setResult(null)
        },
    })

    return (
        <div className="space-y-3 text-xs">
            <div className="flex gap-2">
                <div className="flex-1 space-y-0.5">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Inicio</p>
                    <input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex-1 space-y-0.5">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Fin</p>
                    <input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Escenario</p>
                <div className="space-y-1">
                    {SCENARIOS.map((s) => (
                        <label
                            key={s.value}
                            className="flex items-center gap-2 cursor-pointer hover:text-white text-gray-300 transition-colors"
                        >
                            <input
                                type="radio"
                                name="seed-scenario"
                                value={s.value}
                                checked={scenario === s.value}
                                onChange={() => setScenario(s.value)}
                                className="accent-blue-500"
                            />
                            <span>{s.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <button
                type="button"
                onClick={() => mutate()}
                disabled={isPending || !periodStart || !periodEnd}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded px-3 py-2 transition-colors"
            >
                {isPending ? 'Generando...' : 'Generar asistencias'}
            </button>

            {error && (
                <p className="text-red-400 text-[10px] font-mono">{error}</p>
            )}

            {result && (
                <div className="bg-gray-900 rounded p-2 font-mono space-y-0.5">
                    <p className="text-green-400">✅ {result.created} registros creados</p>
                    <p className="text-gray-400">{result.deleted} eliminados (reset)</p>
                    {result.employees.length > 0 && (
                        <p className="text-gray-500">
                            {result.employees.join(', ')}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
