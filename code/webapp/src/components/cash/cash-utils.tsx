import { CashRegisterType, Direction, TenderType, SessionStatus, AdjustmentType } from '@/types/cash'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ============================================================================
// Cash Register Type Badge
// ============================================================================

interface CashRegisterTypeBadgeProps {
    type: CashRegisterType
    className?: string
}

export function CashRegisterTypeBadge({ type, className }: CashRegisterTypeBadgeProps) {
    const variants: Record<CashRegisterType, { label: string; className: string }> = {
        [CashRegisterType.ON_PREMISE]: {
            label: 'Local',
            className: 'bg-blue-500 text-white',
        },
        [CashRegisterType.DELIVERY]: {
            label: 'Delivery',
            className: 'bg-green-500 text-white',
        },
        [CashRegisterType.EVENT]: {
            label: 'Evento',
            className: 'bg-purple-500 text-white',
        },
    }

    const variant = variants[type]

    return (
        <Badge className={cn(variant.className, className)}>
            {variant.label}
        </Badge>
    )
}

// ============================================================================
// Session Status Badge
// ============================================================================

interface SessionStatusBadgeProps {
    status: SessionStatus
    className?: string
}

export function SessionStatusBadge({ status, className }: SessionStatusBadgeProps) {
    const variants: Record<SessionStatus, { label: string; className: string }> = {
        [SessionStatus.DRAFT]: {
            label: 'En proceso',
            className: 'bg-yellow-500 text-white',
        },
        [SessionStatus.POSTED]: {
            label: 'Cerrada',
            className: 'bg-gray-500 text-white',
        },
    }

    const variant = variants[status]

    return (
        <Badge className={cn(variant.className, className)}>
            {variant.label}
        </Badge>
    )
}

// ============================================================================
// Tender Type Badge
// ============================================================================

interface TenderTypeBadgeProps {
    type: TenderType
    className?: string
}

export function TenderTypeBadge({ type, className }: TenderTypeBadgeProps) {
    const variants: Record<TenderType, { label: string; className: string }> = {
        [TenderType.CASH]: {
            label: 'Efectivo',
            className: 'bg-green-600 text-white',
        },
        [TenderType.CARD]: {
            label: 'Tarjeta',
            className: 'bg-blue-600 text-white',
        },
        [TenderType.TRANSFER]: {
            label: 'Transferencia',
            className: 'bg-purple-600 text-white',
        },
    }

    const variant = variants[type]

    return (
        <Badge className={cn(variant.className, className)}>
            {variant.label}
        </Badge>
    )
}

// ============================================================================
// Adjustment Type Badge
// ============================================================================

interface AdjustmentTypeBadgeProps {
    type: AdjustmentType
    direction: Direction
    className?: string
}

export function AdjustmentTypeBadge({ type, direction, className }: AdjustmentTypeBadgeProps) {
    const isInflow = direction === Direction.INFLOW

    const variants: Record<AdjustmentType, { label: string; inflowClass: string; outflowClass: string }> = {
        [AdjustmentType.SALES]: {
            label: 'Ventas',
            inflowClass: 'bg-green-600 text-white',
            outflowClass: 'bg-red-600 text-white',
        },
        [AdjustmentType.CORRECTION]: {
            label: 'Corrección',
            inflowClass: 'bg-orange-600 text-white',
            outflowClass: 'bg-pink-600 text-white',
        },
    }

    const variant = variants[type]
    const colorClass = isInflow ? variant.inflowClass : variant.outflowClass

    return (
        <Badge className={cn(colorClass, className)}>
            {variant.label} ({isInflow ? 'Ingreso' : 'Egreso'})
        </Badge>
    )
}

// ============================================================================
// Currency Format Helper
// ============================================================================

export function formatCurrency(amount: string | number, currency: string = 'MXN'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

    if (isNaN(numAmount)) {
        return '-'
    }

    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency,
    }).format(numAmount)
}

// ============================================================================
// Date Format Helper
// ============================================================================

export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export function formatDateTime(date: string): string {
    return new Date(date).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}
