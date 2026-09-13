/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { AssignmentsSection } from '../assignments-section'
import type { PriceListAssignment } from '../../types'
import type { Branch, OperatingUnit } from '@/types/auth'

const mockAuthState = vi.hoisted(() => ({
  availableBranches: [] as Branch[],
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

const mockOperatingUnits = vi.hoisted(() => ({ data: [] as OperatingUnit[] }))
const mockCanEdit = vi.hoisted(() => ({ value: true }))

vi.mock('@/hooks/use-inventory-queries', () => ({
  useOperatingUnitsSelect: () => ({ data: mockOperatingUnits.data }),
}))

vi.mock('@/hooks/use-can-access', () => ({
  useCanAccess: () => mockCanEdit.value,
}))

vi.mock('@/components/auth', () => ({
  CanAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const branch1: Branch = {
  id: 1,
  code: 'B1',
  name: 'Downtown',
  region: null,
  timezone: 'UTC',
  is_active: true,
  meta: null,
  created_at: '',
  updated_at: '',
}

const unit1: OperatingUnit = {
  id: 5,
  branch_id: 1,
  name: 'Summer Event',
  type: 'EVENT_TEMP',
  start_date: null,
  end_date: null,
  is_active: true,
  meta: null,
  created_at: '',
  updated_at: '',
}

const branchOnlyAssignment: PriceListAssignment = {
  id: 'pla-1',
  price_list_id: 'pl-1',
  branch_id: 1,
  operating_unit_id: null,
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
}

const unitScopedAssignment: PriceListAssignment = {
  id: 'pla-2',
  price_list_id: 'pl-1',
  branch_id: 1,
  operating_unit_id: 5,
  effective_from: '2026-02-01',
  effective_to: '2026-03-01',
  is_active: false,
}

describe('AssignmentsSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockAuthState.availableBranches = []
    mockOperatingUnits.data = []
    mockCanEdit.value = true
  })

  it('shows a loading state', () => {
    const { container } = render(
      <AssignmentsSection
        assignments={[]}
        isLoading
        isError={false}
        onNewAssignment={vi.fn()}
        onAssignmentClick={vi.fn()}
      />
    )
    expect(container.querySelector('.animate-spin')).toBeDefined()
  })

  it('shows an error state', () => {
    const { getByText } = render(
      <AssignmentsSection
        assignments={[]}
        isLoading={false}
        isError
        onNewAssignment={vi.fn()}
        onAssignmentClick={vi.fn()}
      />
    )
    expect(getByText(/No se pudieron cargar las asignaciones/)).toBeDefined()
  })

  it('calls onRetry when the retry action is clicked on error', () => {
    const onRetry = vi.fn()
    const { getByRole } = render(
      <AssignmentsSection
        assignments={[]}
        isLoading={false}
        isError
        onNewAssignment={vi.fn()}
        onAssignmentClick={vi.fn()}
        onRetry={onRetry}
      />
    )
    fireEvent.click(getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows an empty state', () => {
    const { getByText } = render(
      <AssignmentsSection
        assignments={[]}
        isLoading={false}
        isError={false}
        onNewAssignment={vi.fn()}
        onAssignmentClick={vi.fn()}
      />
    )
    expect(getByText(/Aún no hay asignaciones/)).toBeDefined()
  })

  it('resolves branch and operating unit names, and shows the effective range', () => {
    mockAuthState.availableBranches = [branch1]
    mockOperatingUnits.data = [unit1]
    const { getAllByText, getByText } = render(
      <AssignmentsSection
        assignments={[branchOnlyAssignment, unitScopedAssignment]}
        isLoading={false}
        isError={false}
        onNewAssignment={vi.fn()}
        onAssignmentClick={vi.fn()}
      />
    )
    expect(getAllByText('Downtown')).toHaveLength(2)
    expect(getByText(/Summer Event/)).toBeDefined()
    expect(getByText('2026-01-01 → sin fecha de término')).toBeDefined()
    expect(getByText('2026-02-01 → 2026-03-01')).toBeDefined()
  })

  it('falls back to a placeholder name for an unknown branch/operating unit id', () => {
    const { getByText } = render(
      <AssignmentsSection
        assignments={[unitScopedAssignment]}
        isLoading={false}
        isError={false}
        onNewAssignment={vi.fn()}
        onAssignmentClick={vi.fn()}
      />
    )
    expect(getByText(/Sucursal #1/)).toBeDefined()
    expect(getByText(/Unidad #5/)).toBeDefined()
  })

  it('calls onAssignmentClick when a row is clicked', () => {
    const onAssignmentClick = vi.fn()
    const { getByText } = render(
      <AssignmentsSection
        assignments={[branchOnlyAssignment]}
        isLoading={false}
        isError={false}
        onNewAssignment={vi.fn()}
        onAssignmentClick={onAssignmentClick}
      />
    )
    fireEvent.click(getByText(/Sucursal #1/))
    expect(onAssignmentClick).toHaveBeenCalledWith(branchOnlyAssignment)
  })

  it('renders a non-interactive row without update permission', () => {
    mockCanEdit.value = false
    const onAssignmentClick = vi.fn()
    const { getByText } = render(
      <AssignmentsSection
        assignments={[branchOnlyAssignment]}
        isLoading={false}
        isError={false}
        onNewAssignment={vi.fn()}
        onAssignmentClick={onAssignmentClick}
      />
    )

    expect(getByText(/Sucursal #1/).closest('button')).toBeNull()
    fireEvent.click(getByText(/Sucursal #1/))
    expect(onAssignmentClick).not.toHaveBeenCalled()
  })

  it('calls onNewAssignment when the button is clicked', () => {
    const onNewAssignment = vi.fn()
    const { getByText } = render(
      <AssignmentsSection
        assignments={[]}
        isLoading={false}
        isError={false}
        onNewAssignment={onNewAssignment}
        onAssignmentClick={vi.fn()}
      />
    )
    fireEvent.click(getByText('Nueva asignación'))
    expect(onNewAssignment).toHaveBeenCalledTimes(1)
  })
})
