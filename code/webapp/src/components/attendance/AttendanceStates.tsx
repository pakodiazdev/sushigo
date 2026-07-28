import { Users, XCircle, AlertTriangle, FilterX } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Empty State ────────────────────────────────────────────────────────────────

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Sin empleados activos</p>
            <p className="text-sm text-muted-foreground">
                No hay empleados activos registrados en esta sucursal.
            </p>
        </div>
    )
}

// ── No Matches For Filter State ───────────────────────────────────────────────

interface NoMatchesForFilterStateProps {
    onShowAll: () => void
}

/** Shown when a stat-card filter (e.g. "Ausentes") narrows the grid to zero rows, even though employees exist. */
export function NoMatchesForFilterState({ onShowAll }: Readonly<NoMatchesForFilterStateProps>) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <FilterX className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Sin resultados para este filtro</p>
            <p className="text-sm text-muted-foreground">
                Ningún empleado coincide con la vista seleccionada.
            </p>
            <Button size="sm" variant="neutral" onClick={onShowAll}>
                Ver todos
            </Button>
        </div>
    )
}

// ── Error State ────────────────────────────────────────────────────────────────

export function ErrorState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <XCircle className="h-10 w-10 text-red-500" />
            <p className="text-lg font-medium text-foreground">Error al cargar</p>
            <p className="text-sm text-muted-foreground">
                No se pudo obtener la asistencia. Intenta recargar la página.
            </p>
        </div>
    )
}

// ── No Branch State ────────────────────────────────────────────────────────────

export function NoBranchState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <p className="text-lg font-medium text-foreground">Sin sucursal seleccionada</p>
            <p className="text-sm text-muted-foreground">
                Selecciona una sucursal en la barra lateral para ver la asistencia de hoy.
            </p>
        </div>
    )
}

// ── Skeleton Grid ──────────────────────────────────────────────────────────────

interface SkeletonGridProps {
    count?: number
}

// Stable keys generated once at module load - avoids array index as key
const SKELETON_KEYS = Array.from({ length: 20 }, (_, i) => `skeleton-${i}`)

export function SkeletonGrid({ count = 6 }: Readonly<SkeletonGridProps>) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SKELETON_KEYS.slice(0, count).map((key) => (
                <div
                    key={key}
                    className="rounded-xl border bg-card p-4 h-36 animate-pulse bg-muted/30"
                />
            ))}
        </div>
    )
}
