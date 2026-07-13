import type { OvertimeMovementType, OvertimeOrigin } from '@/types/attendance-payroll'

const TYPE_MAP: Record<OvertimeMovementType, { text: string; cls: string }> = {
  EARNED: { text: 'Ganado', cls: 'bg-green-100 text-green-800' },
  USED: { text: 'Usado', cls: 'bg-gray-100 text-gray-700' },
  PAID: { text: 'Pagado', cls: 'bg-blue-100 text-blue-800' },
  ADJUSTMENT: { text: 'Ajuste', cls: 'bg-purple-100 text-purple-800' },
}

const ORIGIN_MAP: Record<OvertimeOrigin, { text: string; cls: string }> = {
  AUTO: { text: 'Automático', cls: 'bg-gray-100 text-gray-600' },
  MANUAL: { text: 'Manual', cls: 'bg-amber-100 text-amber-800' },
}

/** Movement-type pill used in the Employee panel's Overtime Bank section. */
export function OvertimeMovementTypeBadge({ type }: { readonly type: OvertimeMovementType }) {
  const s = TYPE_MAP[type]
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
}

/** Origin pill (AUTO vs MANUAL) used in the Employee panel's Overtime Bank section. */
export function OvertimeOriginBadge({ origin }: { readonly origin: OvertimeOrigin }) {
  const s = ORIGIN_MAP[origin]
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
}
