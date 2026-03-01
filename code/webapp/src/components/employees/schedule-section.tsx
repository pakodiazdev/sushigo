import { useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, X, Plus, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlidePanelOverlayContext } from '@/components/ui/slide-panel'
import { DAY_LABELS } from '@/types/schedule'
import type { EmployeeSchedule } from '@/types/schedule'
import type { Employee } from '@/types/employee'
import { useScheduleSection } from './-use-schedule-section'

// ── Section (trigger inside detail view) ─────────────────────────────────────

interface ScheduleSectionProps {
  employee: Employee
}

export function ScheduleSection({ employee }: ScheduleSectionProps) {
  const { isOpen, open, close, schedule, periodId, isLoading, isError, goToCreateSchedule } =
    useScheduleSection(employee.id)

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4" />
          Horario activo
        </h3>
        <Button size="sm" variant="ghost" onClick={open} className="h-7 gap-1 px-2 text-xs">
          <CalendarDays className="h-3.5 w-3.5" />
          Ver horario
        </Button>
      </div>

      <ScheduleDialog
        isOpen={isOpen}
        onClose={close}
        employeeName={`${employee.first_name} ${employee.last_name}`}
        schedule={schedule}
        periodId={periodId}
        isLoading={isLoading}
        isError={isError}
        onCreateSchedule={goToCreateSchedule}
      />
    </>
  )
}

// ── Dialog (portals above the SlidePanel) ────────────────────────────────────

interface ScheduleDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeName: string
  schedule: EmployeeSchedule | null
  periodId: string | null
  isLoading: boolean
  isError: boolean
  onCreateSchedule: () => void
}

function ScheduleDialog({
  isOpen,
  onClose,
  employeeName,
  schedule,
  periodId,
  isLoading,
  isError,
  onCreateSchedule,
}: ScheduleDialogProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null)
  const slidePanelOverlay = useContext(SlidePanelOverlayContext)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating('enter'))
      })
    } else if (visible) {
      setAnimating('exit')
      const timer = setTimeout(() => {
        setVisible(false)
        setAnimating(null)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!visible) return null

  const backdropAnimation =
    animating === 'enter'
      ? 'animate-dialog-backdrop-in'
      : animating === 'exit'
        ? 'animate-dialog-backdrop-out'
        : ''

  const panelAnimation =
    animating === 'enter'
      ? 'animate-dialog-in'
      : animating === 'exit'
        ? 'animate-dialog-out'
        : ''

  const portalTarget = slidePanelOverlay?.current ?? null

  const content = (
    <div
      className={`${portalTarget ? 'absolute' : 'fixed'} inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 pt-12 pb-8`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 ${backdropAnimation}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-lg border border-border bg-background shadow-xl ${panelAnimation}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Horario de ${employeeName}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">Horario activo</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <ScheduleSkeleton />
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Error al cargar el horario.</p>
          ) : schedule ? (
            <ScheduleContent schedule={schedule} />
          ) : (
            <EmptySchedule canCreate={!!periodId} onCreateClick={onCreateSchedule} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )

  return portalTarget ? createPortal(content, portalTarget) : content
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScheduleContent({ schedule }: { schedule: EmployeeSchedule }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{schedule.name}</span>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {schedule.workday_type === 'FULL' ? 'Jornada completa' : 'Jornada parcial'}
        </span>
        <span className="text-muted-foreground">{schedule.working_days_per_week} días/sem</span>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="py-2 pl-3 pr-2 text-left">Día</th>
              <th className="py-2 pr-2 text-left">Entrada</th>
              <th className="py-2 pr-2 text-left">Fin almuerzo</th>
              <th className="py-2 pr-3 text-left">Salida</th>
              <th className="py-2 pr-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {[...(schedule.days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week).map((day) => (
              <tr key={day.day_of_week} className="border-b last:border-0">
                <td className="py-2 pl-3 pr-2 font-medium">{DAY_LABELS[day.day_of_week]}</td>
                <td className="py-2 pr-2 text-muted-foreground">{day.expected_start ?? '—'}</td>
                <td className="py-2 pr-2 text-muted-foreground">{day.expected_lunch_end ?? '—'}</td>
                <td className="py-2 pr-3 text-muted-foreground">{day.expected_end ?? '—'}</td>
                <td className="py-2 pr-3 text-center">
                  {day.is_day_off ? (
                    <XCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmptySchedule({ canCreate, onCreateClick }: { canCreate: boolean; onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/50" />
      <p className="mb-1 text-sm font-medium">Sin horario activo</p>
      <p className="mb-4 text-xs text-muted-foreground">
        Este empleado no tiene un horario vigente configurado.
      </p>
      {canCreate && (
        <Button size="sm" onClick={onCreateClick}>
          <Plus className="mr-1 h-4 w-4" />
          Crear horario
        </Button>
      )}
    </div>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
