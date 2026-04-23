import { Button } from '@/components/ui/button'

interface RequestType {
  label: string
  icon: string
  disabled: boolean
  disabledReason?: string
  onClick?: () => void
}

const REQUEST_TYPES: RequestType[] = [
  {
    label: 'Día extra',
    icon: '➕',
    disabled: false,
  },
  {
    label: 'Permiso',
    icon: '📅',
    disabled: true,
    disabledReason: 'Próximamente',
  },
  {
    label: 'Vacaciones',
    icon: '🌴',
    disabled: true,
    disabledReason: 'Próximamente',
  },
]

export function RequestTypeBar() {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Nueva solicitud</h3>
      <div className="flex flex-wrap gap-3">
        {REQUEST_TYPES.map((type) =>
          type.disabled ? (
            <span key={type.label} title={type.disabledReason} className="cursor-not-allowed">
              <Button variant="outline" disabled className="gap-2 pointer-events-none">
                <span>{type.icon}</span>
                {type.label}
              </Button>
            </span>
          ) : (
            <Button
              key={type.label}
              variant="outline"
              onClick={type.onClick}
              className="gap-2"
            >
              <span>{type.icon}</span>
              {type.label}
            </Button>
          ),
        )}
      </div>
    </div>
  )
}
