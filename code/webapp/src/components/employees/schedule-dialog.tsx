import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, X, Plus, Pencil, ArrowLeft, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Employee } from '@/types/employee'
import type { useScheduleSection, ScheduleDialogView } from './use-schedule-section'
import { useDialogAnimation } from './use-dialog-animation'
import { CreateScheduleForm } from './create-schedule-form'
import { ScheduleContent } from './schedule-content'
import { ScheduleHistorySection } from './schedule-history-section'
import { ScheduleCompactSummary } from './schedule-compact-summary'
import { EmptySchedule, ScheduleSkeleton } from './schedule-section-state'

type CtxType = ReturnType<typeof useScheduleSection>
type ScheduleTab = 'config' | 'week' | 'history'

function renderCreateButton(ctx: CtxType) {
  if (!ctx.periodId || ctx.isLoading) return <span />
  const label = ctx.schedule ? 'Nuevo horario' : 'Crear horario'
  return (
    <Button type="button" size="sm" onClick={ctx.showCreate}>
      <Plus className="mr-1 h-4 w-4" />
      {label}
    </Button>
  )
}

function renderEditButton(ctx: CtxType) {
  // Only the currently active schedule (effective_to === null) can be edited in place.
  if (ctx.isLoading || ctx.schedule?.effective_to !== null) return null
  return (
    <Button type="button" variant="outline" size="sm" onClick={ctx.showEdit}>
      <Pencil className="mr-1 h-4 w-4" />
      Editar
    </Button>
  )
}

function renderScheduleBody(ctx: CtxType, employee: Employee, viewMode: 'config' | 'week', onSwitchToWeekView?: () => void) {
  if (ctx.isLoading) return <ScheduleSkeleton />
  if (ctx.isError) return <p className="text-sm text-muted-foreground">Error al cargar el horario.</p>
  if (ctx.schedule) return <ScheduleContent schedule={ctx.schedule} employeeId={employee.id} periodId={ctx.periodId} viewMode={viewMode} onSwitchToWeekView={onSwitchToWeekView} />
  return <EmptySchedule canCreate={!!ctx.periodId} />
}

function getDialogTitle(view: ScheduleDialogView): string {
  if (view === 'create') return 'Nuevo horario'
  if (view === 'edit') return 'Editar horario'
  return 'Horarios'
}

interface ScheduleFormViewProps {
  readonly ctx: CtxType
  readonly employee: Employee
}

function ScheduleFormView({ ctx, employee }: ScheduleFormViewProps) {
  const { view } = ctx
  return (
    <CreateScheduleForm
      employeeId={employee.id}
      periodId={ctx.periodId}
      hasExistingSchedule={!!ctx.schedule}
      currentSchedule={ctx.schedule}
      periodStartDate={
        ctx.schedule
          ? undefined
          : employee.employment_periods?.find((p) => p.is_active)?.start_date
      }
      editScheduleId={view === 'edit' ? ctx.schedule?.id : undefined}
      onSuccess={view === 'edit' ? ctx.onScheduleUpdated : ctx.onScheduleCreated}
      onCancel={ctx.showSchedule}
    />
  )
}

interface ScheduleViewBodyProps {
  readonly ctx: CtxType
  readonly employee: Employee
  readonly activeTab: ScheduleTab
  readonly setActiveTab: (tab: ScheduleTab) => void
  readonly viewMode: 'config' | 'week'
}

function ScheduleViewBody({ ctx, employee, activeTab, setActiveTab, viewMode }: ScheduleViewBodyProps) {
  const tabCls = (tab: ScheduleTab) =>
    `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  return (
    <>
      {/* Tabs — only show when schedule exists */}
      {ctx.schedule && (
        <div className="flex border-b px-5">
          <button className={tabCls('config')} onClick={() => setActiveTab('config')}>
            Configuración
          </button>
          <button className={tabCls('week')} onClick={() => setActiveTab('week')}>
            Vista semanal
          </button>
          <button className={tabCls('history')} onClick={() => setActiveTab('history')}>
            <span className="flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              Historial
            </span>
          </button>
        </div>
      )}

      <div className="max-h-[70vh] overflow-y-auto p-5">
        {activeTab === 'history' && ctx.schedule ? (
          <ScheduleHistorySection
            periodId={ctx.periodId}
            currentScheduleId={ctx.schedule.id}
          />
        ) : (
          renderScheduleBody(ctx, employee, viewMode, () => setActiveTab('week'))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-5 py-3">
        <div className="flex items-center gap-2">
          {renderCreateButton(ctx)}
          {renderEditButton(ctx)}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={ctx.close}>Cerrar</Button>
      </div>
    </>
  )
}

export interface ScheduleDialogProps {
  readonly ctx: CtxType
  readonly employee: Employee
}

export function ScheduleDialog({ ctx, employee }: ScheduleDialogProps) {
  const { isOpen, close, view, isTransitioning } = ctx
  const { visible, backdropCls, panelCls } = useDialogAnimation(isOpen, close)
  const [activeTab, setActiveTab] = useState<ScheduleTab>('config')

  // Reset to config tab whenever the dialog opens
  useEffect(() => {
    if (isOpen) setActiveTab('config')
  }, [isOpen])

  if (!visible) return null

  const viewMode = activeTab === 'week' ? 'week' : 'config' as const
  const isFormView = view === 'create' || view === 'edit'

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
            {isFormView && (
              <button
                onClick={ctx.showSchedule}
                className="rounded-sm text-muted-foreground hover:text-foreground mr-1"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">{getDialogTitle(view)}</h3>
          </div>
          <button onClick={close} className="rounded-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Compact summary line (only when viewing schedule) */}
        {!isFormView && ctx.schedule && (
          <ScheduleCompactSummary schedule={ctx.schedule} />
        )}

        {/* Body — switches between schedule view and create/edit form, with fade */}
        <div
          className="transition-opacity duration-[150ms]"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {isFormView ? (
            <ScheduleFormView ctx={ctx} employee={employee} />
          ) : (
            <ScheduleViewBody
              ctx={ctx}
              employee={employee}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              viewMode={viewMode}
            />
          )}
        </div>
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}
