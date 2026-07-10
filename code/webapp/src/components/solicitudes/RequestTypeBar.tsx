import { Button } from '@/components/ui/button'

interface RequestTypeBarProps {
  readonly onExtraDayClick: () => void
  readonly onLeaveClick: () => void
  readonly onVacationClick: () => void
}

export function RequestTypeBar({ onExtraDayClick, onLeaveClick, onVacationClick }: RequestTypeBarProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Nueva solicitud</h3>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onExtraDayClick} className="gap-2">
          <span aria-hidden="true">➕</span>
          <span>Día extra</span>
        </Button>

        <Button variant="outline" onClick={onLeaveClick} className="gap-2">
          <span aria-hidden="true">📅</span>
          <span>Permiso</span>
        </Button>

        <Button variant="outline" onClick={onVacationClick} className="gap-2">
          <span aria-hidden="true">🌴</span>
          <span>Vacaciones</span>
        </Button>
      </div>
    </div>
  )
}
