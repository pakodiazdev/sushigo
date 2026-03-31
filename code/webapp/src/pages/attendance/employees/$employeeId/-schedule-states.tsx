import { CalendarDays } from 'lucide-react'

// ── EmptySchedule ──────────────────────────────────────────────────────────────

export function EmptySchedule() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
      <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="mb-1 font-medium">Sin horario activo</p>
      <p className="mb-4 text-sm text-muted-foreground">
        Este empleado no tiene un horario vigente configurado.
      </p>
    </div>
  )
}

// ── ScheduleSkeleton ───────────────────────────────────────────────────────────

export function ScheduleSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="border-b px-4 py-3">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex gap-6 border-b px-4 py-3 last:border-0">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
