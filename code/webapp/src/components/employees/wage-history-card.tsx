import { DollarSign, Calendar, Clock, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WageHistory } from '@/types/wage-history'

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

function formatCurrency(amount: number | string): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(value)
}

interface WageHistoryCardProps {
    wage: WageHistory
}

export function WageHistoryCard({ wage }: WageHistoryCardProps) {
    const isActive = !wage.effective_to
    const weeklyGross = parseFloat(wage.hourly_rate) * wage.weekly_scheduled_hours

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatCurrency(weeklyGross)}/semana</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>{formatCurrency(wage.hourly_rate)}/hora</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{wage.weekly_scheduled_hours} hrs/semana</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                                {formatDate(wage.effective_from)}
                                {' — '}
                                {wage.effective_to ? formatDate(wage.effective_to) : 'Presente'}
                            </span>
                        </div>
                        {wage.notes && (
                            <p className="text-sm text-muted-foreground">
                                {wage.notes}
                            </p>
                        )}
                    </div>
                    <Badge variant={isActive ? 'success' : 'default'}>
                        {isActive ? 'Vigente' : 'Anterior'}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}
