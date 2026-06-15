/**
 * Metric card used in the today-report summary row.
 * Pass `highlight` to apply a primary accent border/background (used for "Presentes").
 */
export function SummaryCard({
  label,
  value,
  highlight,
}: {
  readonly label: string
  readonly value: number
  readonly highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 text-center ${highlight ? 'border-primary/30 bg-primary/5' : 'bg-card'}`}
    >
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  )
}
