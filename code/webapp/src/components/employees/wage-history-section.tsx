import { useState } from 'react'
import { DollarSign, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WageHistoryCard } from './wage-history-card'
import { RegisterWageForm } from './register-wage-form'
import { useWageHistory } from '@/services/employee-hooks'

interface WageHistorySectionProps {
    employeeId: string
}

export function WageHistorySection({ employeeId }: Readonly<WageHistorySectionProps>) {
    const [showForm, setShowForm] = useState(false)
    const { data: wages, isLoading, error } = useWageHistory(employeeId)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-destructive">
                <p className="text-sm">Error al cargar el historial de salarios</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Historial de Salarios</h3>
                {!showForm && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="mr-1 h-4 w-4" />
                        Registrar Salario
                    </Button>
                )}
            </div>

            {showForm && (
                <RegisterWageForm
                    employeeId={employeeId}
                    onSuccess={() => setShowForm(false)}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {!wages || wages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <DollarSign className="h-8 w-8 mb-2" />
                    <p className="text-sm">No hay salarios registrados</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {wages.map((wage) => (
                        <WageHistoryCard key={wage.id} wage={wage} />
                    ))}
                </div>
            )}
        </div>
    )
}
