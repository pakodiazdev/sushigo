/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ReplenishmentPolicyForm } from '../replenishment-policy-form'

describe('ReplenishmentPolicyForm', () => {
  afterEach(cleanup)

  const defaults = { min_stock: 5, max_stock: 50, notes: '' }

  it('submits normalised values, mapping an empty note to null', async () => {
    const onSubmit = vi.fn()
    const { getByRole } = render(
      <ReplenishmentPolicyForm defaultValues={defaults} onSubmit={onSubmit} onCancel={vi.fn()} isSaving={false} />
    )

    fireEvent.click(getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ min_stock: 5, max_stock: 50, notes: null })
    )
  })

  it('rejects a ceiling below the reorder point', async () => {
    const onSubmit = vi.fn()
    const { getByRole, getByText } = render(
      <ReplenishmentPolicyForm
        defaultValues={{ min_stock: 80, max_stock: 10, notes: '' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isSaving={false}
      />
    )

    fireEvent.click(getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(getByText(/ceiling must be greater than or equal/i)).toBeTruthy())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onCancel', () => {
    const onCancel = vi.fn()
    const { getByRole } = render(
      <ReplenishmentPolicyForm defaultValues={defaults} onSubmit={vi.fn()} onCancel={onCancel} isSaving={false} />
    )
    fireEvent.click(getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
