import { createPortal } from 'react-dom'
import { CalendarDays, X, Plus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Employee } from '@/types/employee'
import type { useScheduleSection } from './-use-schedule-section'
import { useDialogAnimation } from './-use-dialog-animation'
import { CreateScheduleForm } from './create-schedule-form'
import { ScheduleContent } from './schedule-content'
import { EmptySchedule, ScheduleSkeleton } from './schedule-section-state'

type CtxType = ReturnType<typeof useScheduleSection>

function renderScheduleBody(ctx: CtxType, employee: Employee) {
  if (ctx.isLoading) return <ScheduleSkeleton />
  if (ctx.isError) return <p className="text-sm text-muted-foreground">Error al cargar el horario.</p>
  if (ctx.schedule) return <ScheduleContent schedule={ctx.schedule} employeeId={employee.id} periodId={ctx.periodId} />
  return <EmptySchedule canCreate={!!ctx.periodId} />
}

export interface ScheduleDialogProps {
  readonly ctx: CtxType
  readonly employee: Employee
}

export function ScheduleDialog({ ctx, employee }: ScheduleDialogProps) {
  const { isOpen, close, view, isTransitioning } = ctx
  const { visible, backdropCls, panelCls } = useDialogAnimation(isOpen, close)

  if (!visible) return null

  // Pre-fill effective_from from active period when creating a first schedule.
  const initialEffectiveFrom = ctx.schedule
    ? undefined
    : employee.employment_periods?.find((p) => p.is_active)?.start_date

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <button type="button" aria-label="Cerrar" className={`absolute inset-0 w-full border-0 bg-black/50 p-0 ${backdropCls}`} onClick={close} />

      <dialog
        open
        className={`relative z-10 m-0 w-full max-w-2xl rounded-lg border border-border bg-background p-0 shadow-xl ${panelCls}`}
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            {view === 'create' && (
              <button
                onClick={ctx.showSchedule}
                className="rounded-sm text-muted-foreground hover:text-foreground mr-1"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">
              {view === 'create' ? 'Nuevo horario' : 'Horario activo'}
            </h3>
          </div>
          <button onClick={close} className="rounded-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — switches between schedule view and create form, with fade */}
        <div
          className="transition-opacity duration-[150ms]"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {view === 'create' ? (
            <CreateScheduleForm
              employeeId={employee.id}
              periodId={ctx.periodId}
              hasExistingSchedule={!!ctx.schedule}
              initialEffectiveFrom={initialEffectiveFrom}
              onSuccess={ctx.onScheduleCreated}
              onCancel={ctx.showSchedule}
            />
          ) : (
            <>
              <div className="p-5">{renderScheduleBody(ctx, employee)}</div>
              {/* Footer */}
              <div className="flex items-center justify-between border-t px-5 py-3">
                {ctx.periodId && !ctx.isLoading ? (
                  <Button type="button" size="sm" onClick={ctx.showCreate}>
                    <Plus className="mr-1 h-4 w-4" />
                    {ctx.schedule ? 'Nuevo horario' : 'Crear horario'}
                  </Button>
                ) : <span />}
                <Button type="button" variant="outline" size="sm" onClick={close}>Cerrar</Button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}
