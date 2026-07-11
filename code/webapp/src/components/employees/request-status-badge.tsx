const STATUS_MAP: Record<string, { text: string; cls: string }> = {
  APPROVED: { text: 'Aprobada', cls: 'bg-green-100 text-green-800' },
  PENDING: { text: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800' },
  REJECTED: { text: 'Rechazada', cls: 'bg-red-100 text-red-800' },
  CANCELLED: { text: 'Cancelada', cls: 'bg-gray-100 text-gray-700' },
}

/** Status pill shared by the Vacaciones and Permisos sections of the Employee panel. */
export function RequestStatusBadge({ status }: { readonly status: string }) {
  const s = STATUS_MAP[status] ?? { text: status, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
}
