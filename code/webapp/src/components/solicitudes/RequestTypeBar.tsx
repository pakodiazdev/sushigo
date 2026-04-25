import { Button } from '@/components/ui/button'

interface RequestTypeBarProps {
  readonly onExtraDayClick: () => void
}

export function RequestTypeBar({ onExtraDayClick }: RequestTypeBarProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Nueva solicitud</h3>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onExtraDayClick} className="gap-2">
          <span aria-hidden="true">➕</span>
          <span>Día extra</span>
        </Button>

        <span title="Próximamente" className="cursor-not-allowed">
          <Button variant="outline" disabled className="gap-2 pointer-events-none">
            <span aria-hidden="true">📅</span>
            <span>Permiso</span>
          </Button>
        </span>

        <span title="Próximamente" className="cursor-not-allowed">
          <Button variant="outline" disabled className="gap-2 pointer-events-none">
            <span aria-hidden="true">🌴</span>
            <span>Vacaciones</span>
          </Button>
        </span>
      </div>
    </div>
  )
}
