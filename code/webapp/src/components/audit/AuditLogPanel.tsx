import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuditLog } from '@/services/audit-hooks'
import type { AuditAction, AuditLogFilters } from '@/types/attendance-payroll'

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
}

const ACTION_VARIANTS: Record<AuditAction, 'success' | 'info' | 'error'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value.toString()
  return JSON.stringify(value)
}

export function AuditDiff({ oldValues, newValues }: Readonly<{
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
}>) {
  const fields = Array.from(new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]))

  if (fields.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <ul className="space-y-0.5">
      {fields.map((field) => (
        <li key={field} className="text-xs">
          <span className="font-mono font-medium">{field}</span>
          {': '}
          <span className="text-muted-foreground">{formatValue(oldValues?.[field])}</span>
          {' → '}
          <span>{formatValue(newValues?.[field])}</span>
        </li>
      ))}
    </ul>
  )
}

export interface AuditLogPanelProps {
  filters?: AuditLogFilters
}

export function AuditLogPanel({ filters }: Readonly<AuditLogPanelProps>) {
  const [page, setPage] = useState(1)

  // Reset back to page 1 whenever the caller changes the filter criteria —
  // otherwise a stale page number can point past the end of a new, smaller result set.
  const filtersKey = JSON.stringify(filters)
  useEffect(() => {
    setPage(1)
  }, [filtersKey])

  const { data, isLoading, isError } = useAuditLog({ ...filters, page })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando historial...</p>
  }

  if (isError) {
    return <p className="text-sm text-destructive">Error al cargar el historial de auditoría.</p>
  }

  const logs = data?.data ?? []
  const meta = data?.meta

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay cambios registrados.</p>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Acción</th>
              <th className="py-2 pr-4 font-medium">Usuario</th>
              <th className="py-2 pr-4 font-medium">Cambios</th>
              <th className="py-2 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 align-top">
                <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatDateTime(log.created_at)}</td>
                <td className="py-2 pr-4">
                  <Badge variant={ACTION_VARIANTS[log.action]}>{ACTION_LABELS[log.action]}</Badge>
                </td>
                <td className="py-2 pr-4">{log.user ?? '—'}</td>
                <td className="py-2 pr-4">
                  <AuditDiff oldValues={log.old_values} newValues={log.new_values} />
                </td>
                <td className="py-2 text-muted-foreground">{log.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {meta.current_page} de {meta.last_page} · {meta.total} registros
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              aria-label="Página anterior"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              aria-label="Página siguiente"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
