import { cn } from '@/lib/utils'
import { Badge, type BadgeProps } from '@/components/ui/badge'

export interface LabeledBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
    label: string
    children: React.ReactNode
    variant?: NonNullable<BadgeProps['variant']>
    /** className for the outer label+badge wrapper. */
    className?: string
    /** className for the badge itself, merged over the default field-style shape. */
    badgeClassName?: string
}

/**
 * Label above a read-only, Badge-styled value — for displaying a computed or
 * fixed field (e.g. "Semana actual: 20 jul – 26 jul 2026") without an editable
 * input. Reuses `Badge`'s color variants (and dark-mode support) so this stays
 * the single place that defines how a "field-style" badge looks.
 */
export function LabeledBadge({
    label,
    children,
    variant = 'default',
    className,
    badgeClassName,
    ...props
}: Readonly<LabeledBadgeProps>) {
    // The `default` (neutral) variant's bg-gray-100 reads as barely-there against a light-theme
    // page background — bump it and add a border for a touch more contrast. Colored variants
    // (success/error/warning/info) already have enough contrast from Badge's own palette.
    const isDefaultVariant = variant === 'default'

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <Badge
                variant={variant}
                className={cn(
                    'w-fit rounded-md px-2.5 py-1 text-xs font-normal',
                    isDefaultVariant && 'border border-gray-300 bg-gray-200 dark:border-gray-700',
                    badgeClassName,
                )}
                {...props}
            >
                {children}
            </Badge>
        </div>
    )
}
