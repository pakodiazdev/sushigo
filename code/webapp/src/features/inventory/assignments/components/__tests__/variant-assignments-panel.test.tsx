/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, within } from '@testing-library/react'
import { VariantAssignmentsPanel } from '../variant-assignments-panel'
import type { VariantAssignmentRow } from '../../types'

const assign = vi.fn()
const unassign = vi.fn()
const setSearch = vi.fn()
const setState = vi.fn()
const loadMore = vi.fn()

const hookState = vi.hoisted(() => ({
  canManage: true,
  rows: [] as VariantAssignmentRow[],
  total: 0,
  isLoading: false,
  isError: false,
  hasMore: false,
  isLoadingMore: false,
  state: 'assigned' as 'assigned' | 'unassigned' | 'all',
  pendingVariantId: null as string | null,
}))

vi.mock('../../hooks/use-location-variant-assignments', () => ({
  useLocationVariantAssignments: () => ({
    canManage: hookState.canManage,
    search: '',
    setSearch,
    state: hookState.state,
    setState,
    rows: hookState.rows,
    total: hookState.total,
    isLoading: hookState.isLoading,
    isError: hookState.isError,
    hasMore: hookState.hasMore,
    isLoadingMore: hookState.isLoadingMore,
    loadMore,
    assign,
    unassign,
    pendingVariantId: hookState.pendingVariantId,
  }),
}))

const assignedRow: VariantAssignmentRow = {
  assignment_id: 'a-1',
  assigned: true,
  inventory_location_id: 'loc-1',
  item_variant_id: 'v-1',
  item_variant_code: 'COLA-355',
  item_variant_name: 'Cola 355ml',
  assigned_at: '2026-09-01T00:00:00+00:00',
}
const freeRow: VariantAssignmentRow = {
  assignment_id: null,
  assigned: false,
  inventory_location_id: 'loc-1',
  item_variant_id: 'v-2',
  item_variant_code: 'WATER-500',
  item_variant_name: 'Water 500ml',
  assigned_at: null,
}

describe('VariantAssignmentsPanel', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    hookState.canManage = true
    hookState.rows = []
    hookState.total = 0
    hookState.isLoading = false
    hookState.isError = false
    hookState.hasMore = false
    hookState.isLoadingMore = false
    hookState.state = 'assigned'
    hookState.pendingVariantId = null
  })

  it('shows the empty state for the assigned slice', () => {
    const { getByText } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    expect(getByText(/no variants are managed at this location yet/i)).toBeTruthy()
  })

  it('renders a loading indicator while fetching', () => {
    hookState.isLoading = true
    const { getByText } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    expect(getByText(/loading variants/i)).toBeTruthy()
  })

  it('renders an error state when the list fails to load', () => {
    hookState.isError = true
    const { getByText } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    expect(getByText(/could not load variant assignments/i)).toBeTruthy()
  })

  it('assigns an unassigned variant', () => {
    hookState.state = 'all'
    hookState.rows = [freeRow]
    const { getByTestId } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    const row = getByTestId('variant-assignment-row-WATER-500')
    expect(within(row).getByText('Not managed')).toBeTruthy()
    fireEvent.click(within(row).getByRole('button', { name: 'Assign' }))
    expect(assign).toHaveBeenCalledWith('v-2')
  })

  it('unassigns an assigned variant', () => {
    hookState.rows = [assignedRow]
    const { getByTestId } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    const row = getByTestId('variant-assignment-row-COLA-355')
    expect(within(row).getByText('Managed here')).toBeTruthy()
    fireEvent.click(within(row).getByRole('button', { name: 'Unassign' }))
    expect(unassign).toHaveBeenCalledWith('v-1')
  })

  it('shows a Load more control and a count when more pages exist', () => {
    hookState.rows = [assignedRow]
    hookState.total = 120
    hookState.hasMore = true
    const { getByRole, getByText } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    expect(getByText('Showing 1 of 120')).toBeTruthy()
    fireEvent.click(getByRole('button', { name: 'Load more' }))
    expect(loadMore).toHaveBeenCalled()
  })

  it('hides Load more when there are no further pages', () => {
    hookState.rows = [assignedRow]
    hookState.total = 1
    hookState.hasMore = false
    const { queryByRole } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    expect(queryByRole('button', { name: 'Load more' })).toBeNull()
  })

  it('switches the state filter', () => {
    const { getByRole } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    fireEvent.click(getByRole('button', { name: 'Unassigned' }))
    expect(setState).toHaveBeenCalledWith('unassigned')
  })

  it('types into the search box', () => {
    const { getByPlaceholderText } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    fireEvent.change(getByPlaceholderText(/search by code/i), { target: { value: 'rice' } })
    expect(setSearch).toHaveBeenCalledWith('rice')
  })

  it('hides write controls from a viewer without stock.manage', () => {
    hookState.canManage = false
    hookState.rows = [assignedRow, freeRow]
    hookState.state = 'all'
    const { getByTestId } = render(<VariantAssignmentsPanel locationId="loc-1" />)
    expect(
      within(getByTestId('variant-assignment-row-COLA-355')).queryByRole('button', { name: 'Unassign' })
    ).toBeNull()
    expect(
      within(getByTestId('variant-assignment-row-WATER-500')).queryByRole('button', { name: 'Assign' })
    ).toBeNull()
  })
})
