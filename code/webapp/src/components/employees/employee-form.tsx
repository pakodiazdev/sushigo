import { SlidePanel } from '@/components/ui/slide-panel'
import type { Employee, EmployeePositionRole } from '@/types/employee'
import { Loader2 } from 'lucide-react'
import { EmployeeDetailView } from './employee-detail-view'
import { EmployeeEditCreateForm } from './employee-edit-create-form'
import { useEmployeeForm } from './use-employee-form'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeFormProps {
  employee?: Employee | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * EmployeeForm is a thin orchestration shell.
 * All data-fetching, mutations, and submit logic live in useEmployeeForm.
 */
export function EmployeeForm({ employee, isOpen, onClose, onSuccess }: EmployeeFormProps) {
  const {
    mode,
    setMode,
    panelTitle,
    panelDescription,
    isAdmin,
    currentBranch,
    fullEmployee,
    assignableRoles,
    assignableRolesLoading,
    assignableRolesError,
    suggestedCode,
    isSuggestedCodeLoading,
    isRefreshingCode,
    isLoading,
    isEmployeeLoading,
    isDeactivating,
    isRehiring,
    isTogglingActive,
    handleFormSubmit,
    handleDeactivate,
    handleRehire,
    handleToggleActive,
    handleRefreshCode,
  } = useEmployeeForm({ employee, isOpen, onClose, onSuccess })

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title={panelTitle} description={panelDescription}>
      {/* Detail mode */}
      {mode === 'detail' && fullEmployee && (
        <div key="detail" className="animate-fade-in">
          <EmployeeDetailView
            employee={fullEmployee}
            onEdit={() => setMode('edit')}
            onDeactivate={handleDeactivate}
            onRehire={handleRehire}
            onToggleActive={handleToggleActive}
            isDeactivating={isDeactivating}
            isRehiring={isRehiring}
            isTogglingActive={isTogglingActive}
          />
        </div>
      )}

      {/* Loading state while employee details are fetched (detail mode) */}
      {mode === 'detail' && !fullEmployee && isEmployeeLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Edit / Create mode */}
      {(mode === 'edit' || mode === 'create') && (
        <EmployeeEditCreateForm
          key={mode}
          mode={mode}
          employee={fullEmployee}
          assignableRoles={assignableRoles as EmployeePositionRole[]}
          assignableRolesLoading={assignableRolesLoading}
          assignableRolesError={assignableRolesError}
          isAdmin={isAdmin}
          branchName={currentBranch?.name}
          hasBranch={!!currentBranch}
          isLoading={isLoading}
          onRefreshCode={handleRefreshCode}
          isRefreshingCode={isRefreshingCode}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            if (mode === 'edit') {
              setMode('detail')
            } else {
              onClose()
            }
          }}
          suggestedCode={suggestedCode}
          isSuggestedCodeLoading={isSuggestedCodeLoading}
        />
      )}
    </SlidePanel>
  )
}
