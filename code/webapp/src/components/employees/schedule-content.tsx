import { DAY_LABELS } from '@/types/schedule'
import type { EmployeeSchedule } from '@/types/schedule'
import type { EditDayValues } from './use-create-day-override'
import { useScheduleContent } from './use-schedule-content'
import { ReadRow, EditRow } from './schedule-config-rows'
import { OverrideScopeDialog } from './override-scope-dialog'
import { WeeklyCalendar } from './weekly-calendar'
import { OverrideListDialog } from './override-list-dialog'
import { formatHours } from './schedule-section-utils'

// ── ScheduleContent ───────────────────────────────────────────────────────────

interface ScheduleContentProps {
  readonly schedule: EmployeeSchedule
  readonly employeeId: string
  readonly periodId: string | null
  readonly viewMode?: 'config' | 'week'
  readonly onSwitchToWeekView?: () => void
}

export function ScheduleContent({ schedule, employeeId, periodId, viewMode = 'config', onSwitchToWeekView }: ScheduleContentProps) {
  const {
    override,
    weekStart,
    prevWeek,
    nextWeek,
    overrideListDow,
    openOverrideList,
    closeOverrideList,
    overridesByDow,
    sortedDays,
    findActivePermanentOverride,
    totalWeeklyHours,
    expectedWeeklyHours,
    pendingHours,
    overridesForDow,
    handleOverrideSelect,
  } = useScheduleContent(schedule, employeeId, periodId)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {schedule.workday_type === 'FULL' ? 'Jornada completa' : 'Jornada parcial'}
        </span>
        <span className="text-muted-foreground">{schedule.working_days_per_week} días/sem</span>
        {expectedWeeklyHours === null ? (
          <span className="font-medium tabular-nums">{formatHours(totalWeeklyHours > 0 ? totalWeeklyHours : null)}/sem</span>
        ) : (
          <span className="font-medium tabular-nums">
            {formatHours(totalWeeklyHours > 0 ? totalWeeklyHours : null)} de {formatHours(expectedWeeklyHours)}
          </span>
        )}
        {pendingHours !== null && pendingHours > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400">· {formatHours(pendingHours)} pendientes</span>
        )}
        <span className="text-muted-foreground">
          Desde {new Date(schedule.effective_from + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {viewMode === 'config' ? (
        <>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                  <th className="py-2 pl-3 pr-2 text-left">Día</th>
                  <th className="py-2 pr-2 text-left">Entrada</th>
                  <th className="py-2 pr-2 text-left">Inicio comida</th>
                  <th className="py-2 pr-2 text-left">Duración</th>
                  <th className="py-2 pr-2 text-left">Salida</th>
                  <th className="py-2 pr-2 text-right">Hrs</th>
                  {periodId && <th className="py-2 pr-3 text-left" />}
                </tr>
              </thead>
              <tbody>
                {sortedDays.map((day) => {
                  const allOverridesForDow = overridesByDow[day.day_of_week] ?? []
                  // An indefinite override that has already started is treated as
                  // the day's current effective schedule, not as an "exception".
                  // Uses the same helper as totalWeeklyHours for consistency.
                  const permanentOverride = findActivePermanentOverride(day.day_of_week)
                  // Any override that is NOT the active permanent one is a
                  // temporary exception (single date, range, or future indefinite).
                  const hasTemporaryOverride = allOverridesForDow.some((o) => o !== permanentOverride)
                  const isEditing = override.editingDow === day.day_of_week

                  if (isEditing && override.editValues) {
                    return (
                      <EditRow
                        key={day.day_of_week}
                        day={day}
                        values={override.editValues}
                        errors={override.editErrors}
                        hasErrors={override.hasEditErrors}
                        isPending={override.isPending}
                        onUpdate={override.updateEditField}
                        onToggleDayOff={override.toggleDayOff}
                        onSave={override.openScopeDialog}
                        onCancel={override.cancelEdit}
                        lunchOptions={override.lunchOptions}
                        showActions={!!periodId}
                      />
                    )
                  }

                  return (
                    <ReadRow
                      key={day.day_of_week}
                      day={day}
                      permanentOverride={permanentOverride}
                      hasTemporaryOverride={hasTemporaryOverride}
                      onEdit={() => {
                        if (permanentOverride) {
                          // Pre-fill the edit form from the currently active
                          // permanent override, not from the base schedule day.
                          const prefill: EditDayValues = {
                            is_day_off: permanentOverride.is_day_off,
                            expected_start: permanentOverride.expected_start ?? '',
                            expected_lunch_start: permanentOverride.expected_lunch_start ?? '',
                            lunch_duration_minutes:
                              permanentOverride.lunch_duration_minutes === null
                                ? ''
                                : String(permanentOverride.lunch_duration_minutes),
                            expected_end: permanentOverride.expected_end ?? '',
                          }
                          override.startEdit(day, sortedDays, prefill)
                        } else {
                          override.startEdit(day, sortedDays)
                        }
                      }}
                      onClickOverride={
                        allOverridesForDow.length > 0
                          ? () => openOverrideList(day.day_of_week)
                          : undefined
                      }
                      showActions={!!periodId}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>

          {override.scopeOpen && override.editingDow && (
            <OverrideScopeDialog
              dayLabel={DAY_LABELS[override.editingDow] ?? ''}
              dayOfWeek={override.editingDow}
              existingOverrides={overridesByDow[override.editingDow] ?? []}
              isPending={override.isPending}
              isError={override.isError}
              onSubmit={override.submit}
              onClose={override.closeScopeDialog}
            />
          )}
        </>
      ) : (
        <WeeklyCalendar
          schedule={schedule}
          weekStart={weekStart}
          prevWeek={prevWeek}
          nextWeek={nextWeek}
          openOverrideList={openOverrideList}
        />
      )}

      {/* OverrideListDialog — shared between Configuración and Vista semanal */}
      {overrideListDow !== null && (
        <OverrideListDialog
          dow={overrideListDow}
          dayLabel={DAY_LABELS[overrideListDow] ?? ''}
          overrides={overridesForDow}
          onSelect={(o) => handleOverrideSelect(o, onSwitchToWeekView)}
          onClose={closeOverrideList}
        />
      )}
    </div>
  )
}
