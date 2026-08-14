import { SlidePanel } from '@/components/ui/slide-panel'
import type { Employee, EmployeePositionRole } from '@/types/employee'
import { Loader2 } from 'lucide-react'
import { EmployeeDetailView } from './employee-detail-view'
import { EmployeeEditCreateForm } from './employee-edit-create-form'
import { useEmployeeForm } from './use-employee-form'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeFormProps {
  readonly employee?: Employee | null
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSuccess: () => void
  readonly onCreated?: (employee: Employee) => void
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * EmployeeForm is a thin orchestration shell.
 * All data-fetching, mutations, and submit logic live in useEmployeeForm.
 */
export function EmployeeForm({ employee, isOpen, onClose, onSuccess, onCreated }: EmployeeFormProps) {
  const {
    mode,
    setMode,
    panelTitle,
    panelDescription,
    isAdmin,
    canManageUsers,
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
  } = useEmployeeForm({ employee, isOpen, onClose, onSuccess, onCreated })

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
          // Keyed by employee id too, not just mode: without it, switching the panel from
          // one employee to another while staying in edit mode (e.g. browser back/forward
          // across two ?form=<id> URLs without closing the panel) reuses the same
          // MediaGalleryUploader instance. Its galleryId/ownerToken live in refs that only
          // reset on remount, so a photo uploaded for the first employee stays associated
          // with that stale gallery — a later interaction (or a fresh upload, which resumes
          // the same non-empty gallery) can then attach it to the second employee instead.
          key={mode === 'edit' ? `edit-${fullEmployee?.id ?? ''}` : mode}
          mode={mode}
          employee={fullEmployee}
          assignableRoles={assignableRoles as EmployeePositionRole[]}
          assignableRolesLoading={assignableRolesLoading}
          assignableRolesError={assignableRolesError}
          isAdmin={isAdmin}
          canManageUsers={canManageUsers}
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
