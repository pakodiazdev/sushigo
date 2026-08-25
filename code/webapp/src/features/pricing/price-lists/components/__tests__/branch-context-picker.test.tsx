/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { BranchContextPicker } from '../branch-context-picker'
import type { Branch, OperatingUnit } from '@/types/auth'

const mockAuthState = vi.hoisted(() => ({ availableBranches: [] as Branch[] }))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

const mockOperatingUnitsState = vi.hoisted(() => ({ data: [] as OperatingUnit[], isLoading: false }))

vi.mock('@/hooks/use-inventory-queries', () => ({
  useOperatingUnitsSelect: () => mockOperatingUnitsState,
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
const branch2: Branch = {
  id: 2,
  code: 'B2',
  name: 'Uptown',
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
const unit2: OperatingUnit = {
  id: 6,
  branch_id: 2,
  name: 'Other Branch Unit',
  type: 'EVENT_TEMP',
  start_date: null,
  end_date: null,
  is_active: true,
  meta: null,
  created_at: '',
  updated_at: '',
}

function selects(container: HTMLElement): [HTMLSelectElement, HTMLSelectElement] {
  const all = container.querySelectorAll('select')
  return [all[0] as HTMLSelectElement, all[1] as HTMLSelectElement]
}

describe('BranchContextPicker', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockAuthState.availableBranches = []
    mockOperatingUnitsState.data = []
    mockOperatingUnitsState.isLoading = false
  })

  it('lists only the user’s available branches', () => {
    mockAuthState.availableBranches = [branch1, branch2]
    const { getByText } = render(
      <BranchContextPicker
        branchId={null}
        onBranchChange={vi.fn()}
        operatingUnitId={null}
        onOperatingUnitChange={vi.fn()}
      />
    )
    expect(getByText('Downtown')).toBeDefined()
    expect(getByText('Uptown')).toBeDefined()
  })

  it('disables the Operating Unit select until a branch is chosen', () => {
    mockAuthState.availableBranches = [branch1]
    const { container } = render(
      <BranchContextPicker
        branchId={null}
        onBranchChange={vi.fn()}
        operatingUnitId={null}
        onOperatingUnitChange={vi.fn()}
      />
    )
    const [, operatingUnitSelect] = selects(container)
    expect(operatingUnitSelect.disabled).toBe(true)
  })

  it('filters Operating Unit options to the selected branch', () => {
    mockAuthState.availableBranches = [branch1, branch2]
    mockOperatingUnitsState.data = [unit1, unit2]
    const { getByText, queryByText } = render(
      <BranchContextPicker
        branchId={1}
        onBranchChange={vi.fn()}
        operatingUnitId={null}
        onOperatingUnitChange={vi.fn()}
      />
    )
    expect(getByText('Summer Event')).toBeDefined()
    expect(queryByText('Other Branch Unit')).toBeNull()
  })

  it('resets the Operating Unit when the branch changes', () => {
    mockAuthState.availableBranches = [branch1, branch2]
    const onBranchChange = vi.fn()
    const onOperatingUnitChange = vi.fn()
    const { container } = render(
      <BranchContextPicker
        branchId={1}
        onBranchChange={onBranchChange}
        operatingUnitId={5}
        onOperatingUnitChange={onOperatingUnitChange}
      />
    )
    const [branchSelect] = selects(container)
    fireEvent.change(branchSelect, { target: { value: '2' } })
    expect(onBranchChange).toHaveBeenCalledWith(2)
    expect(onOperatingUnitChange).toHaveBeenCalledWith(null)
  })

  it('clears the branch selection when the empty option is chosen', () => {
    mockAuthState.availableBranches = [branch1]
    const onBranchChange = vi.fn()
    const { container } = render(
      <BranchContextPicker
        branchId={1}
        onBranchChange={onBranchChange}
        operatingUnitId={null}
        onOperatingUnitChange={vi.fn()}
      />
    )
    const [branchSelect] = selects(container)
    fireEvent.change(branchSelect, { target: { value: '' } })
    expect(onBranchChange).toHaveBeenCalledWith(null)
  })

  it('changes the operating unit selection', () => {
    mockAuthState.availableBranches = [branch1]
    mockOperatingUnitsState.data = [unit1]
    const onOperatingUnitChange = vi.fn()
    const { container } = render(
      <BranchContextPicker
        branchId={1}
        onBranchChange={vi.fn()}
        operatingUnitId={null}
        onOperatingUnitChange={onOperatingUnitChange}
      />
    )
    const [, operatingUnitSelect] = selects(container)
    fireEvent.change(operatingUnitSelect, { target: { value: '5' } })
    expect(onOperatingUnitChange).toHaveBeenCalledWith(5)
  })

  it('clears the operating unit selection when the empty option is chosen', () => {
    mockAuthState.availableBranches = [branch1]
    mockOperatingUnitsState.data = [unit1]
    const onOperatingUnitChange = vi.fn()
    const { container } = render(
      <BranchContextPicker
        branchId={1}
        onBranchChange={vi.fn()}
        operatingUnitId={5}
        onOperatingUnitChange={onOperatingUnitChange}
      />
    )
    const [, operatingUnitSelect] = selects(container)
    fireEvent.change(operatingUnitSelect, { target: { value: '' } })
    expect(onOperatingUnitChange).toHaveBeenCalledWith(null)
  })

  it('surfaces field errors', () => {
    const { getByText } = render(
      <BranchContextPicker
        branchId={null}
        onBranchChange={vi.fn()}
        operatingUnitId={null}
        onOperatingUnitChange={vi.fn()}
        branchError="Branch is required"
        operatingUnitError="El Operating Unit indicado no pertenece al Branch indicado."
      />
    )
    expect(getByText('Branch is required')).toBeDefined()
    expect(getByText('El Operating Unit indicado no pertenece al Branch indicado.')).toBeDefined()
  })

  it('disables the branch select when branchDisabled is set', () => {
    mockAuthState.availableBranches = [branch1]
    const { container } = render(
      <BranchContextPicker
        branchId={1}
        onBranchChange={vi.fn()}
        operatingUnitId={null}
        onOperatingUnitChange={vi.fn()}
        branchDisabled
      />
    )
    const [branchSelect] = selects(container)
    expect(branchSelect.disabled).toBe(true)
  })
})
