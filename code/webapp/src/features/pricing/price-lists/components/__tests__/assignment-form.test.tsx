/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { AssignmentForm } from '../assignment-form'
import type { PriceListAssignment } from '../../types'

const mockHandleSubmit = vi.fn((cb: (data: unknown) => void) => (e?: { preventDefault?: () => void }) => {
  e?.preventDefault?.()
  cb({})
})
const mockOnSubmit = vi.fn()
const mockSetValue = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../../hooks/use-assignment-form', () => ({
  useAssignmentForm: () => mockHookState.value,
}))

vi.mock('../branch-context-picker', () => ({
  BranchContextPicker: ({
    branchDisabled,
    onBranchChange,
    onOperatingUnitChange,
  }: {
    branchDisabled?: boolean
    onBranchChange: (value: number | null) => void
    onOperatingUnitChange: (value: number | null) => void
  }) => (
    <div data-testid="branch-context-picker" data-disabled={String(!!branchDisabled)}>
      <button type="button" data-testid="pick-branch" onClick={() => onBranchChange(2)}>
        Pick branch
      </button>
      <button type="button" data-testid="pick-operating-unit" onClick={() => onOperatingUnitChange(5)}>
        Pick operating unit
      </button>
    </div>
  ),
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: {
    Body: ({ children }: { children: React.ReactNode }) => <div data-testid="slide-panel-body">{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div data-testid="slide-panel-footer">{children}</div>,
  },
}))

vi.mock('@/components/auth', () => ({
  CanAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function setHookState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  mockHookState.value = { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    isEditing: false,
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    onSubmit: mockOnSubmit,
    allErrors: {} as Record<string, string | undefined>,
    conflictError: undefined as string | undefined,
    branchId: null,
    operatingUnitId: null,
    isActive: true,
    isSubmitting: false,
    handleDelete: vi.fn(),
    isDeleting: false,
  }
}

const existingAssignment: PriceListAssignment = {
  id: 'pla-1',
  price_list_id: 'pl-1',
  branch_id: 1,
  operating_unit_id: null,
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
}

describe('AssignmentForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders "Create Assignment" in create mode with branch selectable', () => {
    setHookState()
    const { getByText, getByTestId } = render(
      <AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />
    )
    expect(getByText('Create Assignment')).toBeDefined()
    expect(getByTestId('branch-context-picker').dataset.disabled).toBe('false')
  })

  it('disables the branch picker in edit mode', () => {
    setHookState({ isEditing: true })
    const { getByText, getByTestId } = render(
      <AssignmentForm priceListId="pl-1" assignment={existingAssignment} onSuccess={vi.fn()} onCancel={vi.fn()} />
    )
    expect(getByText('Update Assignment')).toBeDefined()
    expect(getByTestId('branch-context-picker').dataset.disabled).toBe('true')
  })

  it('renders a conflict banner when conflictError is set', () => {
    setHookState({ conflictError: 'Ya existe una asignación activa con la misma prioridad...' })
    const { getByText } = render(<AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(getByText(/Ya existe una asignación activa/)).toBeDefined()
  })

  it('does not render a conflict banner when there is none', () => {
    setHookState()
    const { queryByText } = render(<AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(queryByText(/Ya existe/)).toBeNull()
  })

  it('calls onCancel when Cancel is clicked', () => {
    setHookState()
    const onCancel = vi.fn()
    const { getByText } = render(<AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls handleSubmit/onSubmit when the form is submitted', () => {
    setHookState()
    const { container } = render(<AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.submit(container.querySelector('form')!)
    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('surfaces field errors', () => {
    setHookState({ allErrors: { effective_from: 'Effective from is required' } })
    const { getByText } = render(<AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(getByText('Effective from is required')).toBeDefined()
  })

  it('wires the branch/operating-unit picker into setValue', () => {
    setHookState()
    const { getByTestId } = render(<AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(getByTestId('pick-branch'))
    expect(mockSetValue).toHaveBeenCalledWith('branch_id', 2)
    fireEvent.click(getByTestId('pick-operating-unit'))
    expect(mockSetValue).toHaveBeenCalledWith('operating_unit_id', 5)
  })

  it('wires the Active checkbox into setValue', () => {
    setHookState()
    const { getByLabelText } = render(<AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(getByLabelText('Active'))
    expect(mockSetValue).toHaveBeenCalledWith('is_active', false)
  })

  it('does not render a Delete button in create mode', () => {
    setHookState()
    const { queryByText } = render(<AssignmentForm priceListId="pl-1" onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(queryByText('Delete')).toBeNull()
  })

  it('calls handleDelete when Delete is clicked in edit mode', () => {
    const handleDelete = vi.fn()
    setHookState({ isEditing: true, handleDelete })
    const { getByText } = render(
      <AssignmentForm priceListId="pl-1" assignment={existingAssignment} onSuccess={vi.fn()} onCancel={vi.fn()} />
    )
    fireEvent.click(getByText('Delete'))
    expect(handleDelete).toHaveBeenCalledTimes(1)
  })
})
