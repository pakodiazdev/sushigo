/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { ReplenishmentPoliciesPanel, type ReplenishmentPanelItem } from '../replenishment-policies-panel'

const save = vi.fn()
const clear = vi.fn()
const startEditing = vi.fn()
const cancelEditing = vi.fn()
const hookState = vi.hoisted(() => ({
  editingVariantId: null as string | null,
  canManage: true,
  editingPolicy: undefined as { notes: string | null } | undefined,
  isEditingPolicyLoading: false,
}))

vi.mock('../../hooks/use-location-replenishment-policies', () => ({
  useLocationReplenishmentPolicies: () => ({
    canManage: hookState.canManage,
    editingVariantId: hookState.editingVariantId,
    editingPolicy: hookState.editingPolicy,
    isEditingPolicyLoading: hookState.isEditingPolicyLoading,
    startEditing,
    cancelEditing,
    save,
    clear,
    isSaving: false,
    isClearing: false,
  }),
}))

const configured: ReplenishmentPanelItem = {
  item_variant_id: 'v-1',
  item_variant_code: 'COLA-355',
  item_variant_name: 'Cola 355ml',
  min_stock: 10,
  max_stock: 100,
  is_low_stock: true,
}
const unset: ReplenishmentPanelItem = {
  item_variant_id: 'v-2',
  item_variant_code: 'WATER-500',
  item_variant_name: 'Water 500ml',
  min_stock: null,
  max_stock: null,
  is_low_stock: false,
}

describe('ReplenishmentPoliciesPanel', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    hookState.editingVariantId = null
    hookState.canManage = true
    hookState.editingPolicy = undefined
    hookState.isEditingPolicyLoading = false
  })

  it('shows an empty hint when there is no stock at the location', () => {
    const { getByText } = render(<ReplenishmentPoliciesPanel locationId="loc-1" items={[]} />)
    expect(getByText(/no stock at this location yet/i)).toBeTruthy()
  })

  it('renders the resolved threshold and a low badge for a configured row', () => {
    const { getByTestId } = render(
      <ReplenishmentPoliciesPanel locationId="loc-1" items={[configured]} />
    )
    const row = getByTestId('replenishment-row-COLA-355')
    expect(within(row).getByText(/Reorder 10 · Ceiling 100/)).toBeTruthy()
    expect(within(row).getByText('Low')).toBeTruthy()
  })

  it('offers "Set" and no Clear for an unconfigured row', () => {
    const { getByTestId } = render(<ReplenishmentPoliciesPanel locationId="loc-1" items={[unset]} />)
    const row = getByTestId('replenishment-row-WATER-500')
    expect(within(row).getByText('No threshold set')).toBeTruthy()
    expect(within(row).getByRole('button', { name: 'Set' })).toBeTruthy()
    expect(within(row).queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('starts editing when Edit is clicked', () => {
    const { getByTestId } = render(
      <ReplenishmentPoliciesPanel locationId="loc-1" items={[configured]} />
    )
    fireEvent.click(within(getByTestId('replenishment-row-COLA-355')).getByRole('button', { name: 'Edit' }))
    expect(startEditing).toHaveBeenCalledWith('v-1')
  })

  it('clears a configured row', () => {
    const { getByTestId } = render(
      <ReplenishmentPoliciesPanel locationId="loc-1" items={[configured]} />
    )
    fireEvent.click(within(getByTestId('replenishment-row-COLA-355')).getByRole('button', { name: 'Clear' }))
    expect(clear).toHaveBeenCalledWith('v-1')
  })

  it('submits the inline form for the row being edited', async () => {
    hookState.editingVariantId = 'v-1'
    const { getByTestId } = render(
      <ReplenishmentPoliciesPanel locationId="loc-1" items={[configured]} />
    )
    const row = getByTestId('replenishment-row-COLA-355')
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith('v-1', { min_stock: 10, max_stock: 100, notes: null })
    )
  })

  it('seeds the editor with the resolved policy notes so Save does not blank them', async () => {
    hookState.editingVariantId = 'v-1'
    hookState.editingPolicy = { notes: 'Bar fridge only holds two crates' }
    const { getByTestId } = render(
      <ReplenishmentPoliciesPanel locationId="loc-1" items={[configured]} />
    )
    const row = getByTestId('replenishment-row-COLA-355')
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith('v-1', {
        min_stock: 10,
        max_stock: 100,
        notes: 'Bar fridge only holds two crates',
      })
    )
  })

  it('waits for the resolved policy before showing the editor for a configured row', () => {
    hookState.editingVariantId = 'v-1'
    hookState.isEditingPolicyLoading = true
    const { getByTestId } = render(
      <ReplenishmentPoliciesPanel locationId="loc-1" items={[configured]} />
    )
    const row = getByTestId('replenishment-row-COLA-355')
    expect(within(row).getByText(/loading current policy/i)).toBeTruthy()
    expect(within(row).queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('hides every write control from a viewer without stock.manage', () => {
    hookState.canManage = false
    const { getByTestId } = render(
      <ReplenishmentPoliciesPanel locationId="loc-1" items={[configured]} />
    )
    const row = getByTestId('replenishment-row-COLA-355')
    // the resolved threshold is still visible read-only
    expect(within(row).getByText(/Reorder 10 · Ceiling 100/)).toBeTruthy()
    expect(within(row).queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(within(row).queryByRole('button', { name: 'Clear' })).toBeNull()
  })
})
