import { FormField, Select } from '@/components/ui/form-fields'
import { useAuthStore } from '@/stores/auth.store'
import { useOperatingUnitsSelect } from '@/hooks/use-inventory-queries'

interface BranchContextPickerProps {
  branchId: number | null
  onBranchChange: (branchId: number | null) => void
  operatingUnitId: number | null
  onOperatingUnitChange: (operatingUnitId: number | null) => void
  branchError?: string
  operatingUnitError?: string
  /** Branch is immutable once an Assignment exists — the backend treats reassigning a
   *  Branch as a new authorization decision, not an update (delete + recreate instead). */
  branchDisabled?: boolean
}

/**
 * Branch (required) + Operating Unit (optional, more specific override within that branch)
 * picker — the same shape PriceListAssignment and the resolve-preview both need. Branch
 * options come from the current user's own branch access (`availableBranches`), mirroring
 * PriceListAssignmentPolicy's own `ChecksBranchAccess` requirement: a user can only assign or
 * preview pricing for a branch they actually have access to.
 */
export function BranchContextPicker({
  branchId,
  onBranchChange,
  operatingUnitId,
  onOperatingUnitChange,
  branchError,
  operatingUnitError,
  branchDisabled,
}: Readonly<BranchContextPickerProps>) {
  const { availableBranches } = useAuthStore()
  const { data: operatingUnits = [], isLoading: isOperatingUnitsLoading } = useOperatingUnitsSelect()

  const operatingUnitsForBranch = operatingUnits.filter((unit) => unit.branch_id === branchId)

  return (
    <>
      <FormField label="Branch" required error={branchError}>
        <Select
          value={branchId ?? ''}
          onChange={(e) => {
            onBranchChange(e.target.value ? Number(e.target.value) : null)
            onOperatingUnitChange(null)
          }}
          error={!!branchError}
          disabled={branchDisabled}
        >
          <option value="">Select a branch…</option>
          {availableBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Operating Unit"
        error={operatingUnitError}
        hint="Optional — a more specific override within the branch"
      >
        <Select
          value={operatingUnitId ?? ''}
          onChange={(e) => onOperatingUnitChange(e.target.value ? Number(e.target.value) : null)}
          error={!!operatingUnitError}
          disabled={!branchId || isOperatingUnitsLoading}
        >
          <option value="">Whole branch</option>
          {operatingUnitsForBranch.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </Select>
      </FormField>
    </>
  )
}
