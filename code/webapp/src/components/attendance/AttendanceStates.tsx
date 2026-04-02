import { Users, XCircle, AlertTriangle } from 'lucide-react'

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
