import { SlidePanel } from '@/components/ui/slide-panel'
import { AuditLogPanel } from './AuditLogPanel'
import type { AuditLogFilters } from '@/types/attendance-payroll'

export interface AuditLogDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  filters: AuditLogFilters
}

export function AuditLogDialog({ isOpen, onClose, title, description, filters }: Readonly<AuditLogDialogProps>) {
  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description ?? 'Historial de cambios y auditoría'}
      size="lg"
    >
      <AuditLogPanel filters={filters} />
    </SlidePanel>
  )
}
