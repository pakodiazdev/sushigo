import { ChevronLeft, ChevronRight, Clock, UserX, LogOut } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import type { UseCloseDayPanelResult } from './use-close-day-panel'

function resolveStepLabel(currentStep: string, hasPendingLunchReturns: boolean): string {
  if (currentStep === 'lunch-returns') {
    return 'Paso 1 de 2 — Regresos de comida pendientes'
  }
  return hasPendingLunchReturns
    ? 'Paso 2 de 2 — Confirmar cierre'
    : 'Confirmar cierre del día'
}

interface CloseDayPanelProps {
  panel: UseCloseDayPanelResult
}

export function CloseDayPanel({ panel }: Readonly<CloseDayPanelProps>) {
  const {
    isOpen,
    close,
    currentStep,
    hasPendingLunchReturns,
    goNext,
    goBack,
    lunchReturnEntries,
    updateLunchReturn,
    closeTime,
    setCloseTime,
    summary,
    confirm,
    isSubmitting,
  } = panel

  const stepLabel = resolveStepLabel(currentStep, hasPendingLunchReturns)

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={close}
      title="Cerrar día"
      description={stepLabel}
      size="lg"
      noPadding
    >
      <div className="flex h-full flex-col">
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === 'lunch-returns' && (
            <LunchReturnsStep
              entries={lunchReturnEntries}
              onUpdate={updateLunchReturn}
            />
          )}

          {currentStep === 'confirm' && (
            <ConfirmStep
              closeTime={closeTime}
              onCloseTimeChange={setCloseTime}
              summary={summary}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/50 px-6 py-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={currentStep === 'lunch-returns' || !hasPendingLunchReturns ? close : goBack}
              disabled={isSubmitting}
            >
              {currentStep === 'lunch-returns' || !hasPendingLunchReturns ? (
                'Cancelar'
              ) : (
                <>
                  <ChevronLeft className="mr-1.5 h-4 w-4" />
                  Anterior
                </>
              )}
            </Button>

            {currentStep === 'lunch-returns' ? (
              <Button onClick={goNext}>
                Siguiente
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={confirm} disabled={isSubmitting}>
                {isSubmitting ? 'Cerrando...' : 'Confirmar cierre'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </SlidePanel>
  )
}

// ── Step 1: Lunch Returns ────────────────────────────────────────────────────

interface LunchReturnsStepProps {
  entries: UseCloseDayPanelResult['lunchReturnEntries']
  onUpdate: (attendanceId: string, time: string) => void
}

function LunchReturnsStep({ entries, onUpdate }: Readonly<LunchReturnsStepProps>) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Regresos de comida pendientes</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Estos empleados salieron a comer pero no se registró su regreso.
          La hora sugerida se calcula según su tiempo de comida.
        </p>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium">Empleado</th>
              <th className="px-4 py-2.5 text-center font-medium">Salió a comer</th>
              <th className="px-4 py-2.5 text-center font-medium">Hora de regreso</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.attendanceId} className="border-b last:border-b-0">
                <td className="px-4 py-2.5 font-medium">{entry.employeeName}</td>
                <td className="px-4 py-2.5 text-center font-mono">
                  {entry.lunchStartDisplay}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <input
                    type="time"
                    value={entry.selectedReturn}
                    onChange={(e) => onUpdate(entry.attendanceId, e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Step 2: Confirm ──────────────────────────────────────────────────────────

interface ConfirmStepProps {
  closeTime: string
  onCloseTimeChange: (time: string) => void
  summary: UseCloseDayPanelResult['summary']
}

function ConfirmStep({ closeTime, onCloseTimeChange, summary }: Readonly<ConfirmStepProps>) {
  return (
    <div className="space-y-6">
      {/* Close time input */}
      <div>
        <h3 className="text-base font-semibold">Hora de cierre</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta hora se aplicará como salida para todos los empleados que aún no la tienen.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <input
            type="time"
            value={closeTime}
            onChange={(e) => onCloseTimeChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Check-outs section */}
      {summary.checkOuts.length > 0 && (
        <SummarySection
          icon={<LogOut className="h-4 w-4" />}
          title="Salida"
          description={`${summary.checkOuts.length} empleado(s) recibirán check-out`}
          items={summary.checkOuts.map((e) => e.employeeName)}
          variant="info"
        />
      )}

      {/* Absences section */}
      {summary.absences.length > 0 && (
        <SummarySection
          icon={<UserX className="h-4 w-4" />}
          title="Falta"
          description={`${summary.absences.length} empleado(s) se marcarán como ausencia`}
          items={summary.absences.map((e) => e.employeeName)}
          variant="warning"
        />
      )}

      {summary.checkOuts.length === 0 && summary.absences.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Todos los empleados ya tienen su registro completo para hoy.
        </div>
      )}
    </div>
  )
}

// ── Summary Section ──────────────────────────────────────────────────────────

interface SummarySectionProps {
  icon: React.ReactNode
  title: string
  description: string
  items: string[]
  variant: 'info' | 'warning'
}

function SummarySection({ icon, title, description, items, variant }: Readonly<SummarySectionProps>) {
  const colors = variant === 'info'
    ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
    : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'

  const headerColors = variant === 'info'
    ? 'text-blue-800 dark:text-blue-300'
    : 'text-amber-800 dark:text-amber-300'

  return (
    <div className={`rounded-lg border p-4 ${colors}`}>
      <div className={`flex items-center gap-2 font-semibold ${headerColors}`}>
        {icon}
        {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <ul className="mt-2 space-y-1">
        {items.map((name) => (
          <li key={name} className="text-sm">
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}
