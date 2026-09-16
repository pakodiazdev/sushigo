/** @vitest-environment jsdom */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { StockTransferLineFields } from '../stock-transfer-line-fields'
import type { StockTransferFormValues } from '../../hooks/use-stock-transfer-form'

const previewState = vi.hoisted(() => ({
  preview: undefined as Record<string, unknown> | undefined,
  previewLoading: false,
  previewErrorMessage: undefined as string | undefined,
}))

vi.mock('../../hooks/use-stock-transfer-line-preview', () => ({
  useStockTransferLinePreview: () => previewState,
}))

function Harness(props: Partial<Parameters<typeof StockTransferLineFields>[0]> = {}) {
  const { register } = useForm<StockTransferFormValues>({
    defaultValues: {
      source_location_id: 'src',
      destination_location_id: 'dst',
      reference: '',
      transfer_date: '2026-09-15',
      notes: '',
      lines: [{ item_variant_id: 'v-a', entry_uom_id: 'u-kg', entry_quantity: 5 }],
    },
  })

  return (
    <StockTransferLineFields
      index={0}
      fieldId="line-1"
      fieldVariantId="v-a"
      currentVariantId="v-a"
      entryUomId="u-kg"
      entryQuantity={5}
      sourceLocationId="src"
      destinationLocationId="dst"
      register={register}
      uoms={[{ id: 'u-kg', code: 'KG', name: 'Kilogramo', symbol: 'kg', type: 'WEIGHT', precision: 4, is_base: true, is_active: true }]}
      selectableVariants={[
        { assignment_id: 'a1', assigned: true, inventory_location_id: 'dst', item_variant_id: 'v-a', item_variant_code: 'RICE', item_variant_name: 'Arroz', item_variant_is_active: true, assigned_at: null },
      ]}
      canRemove={false}
      onRemove={vi.fn()}
      {...props}
    />
  )
}

describe('StockTransferLineFields', () => {
  afterEach(() => {
    cleanup()
    previewState.preview = undefined
    previewState.previewLoading = false
    previewState.previewErrorMessage = undefined
  })

  it('shows nothing extra while there is no preview, no loading, and no error', () => {
    const view = render(<Harness />)
    expect(view.queryByText(/Disponible en origen/i)).toBeNull()
    expect(view.queryByText(/Calculando disponibilidad/i)).toBeNull()
  })

  it('shows a loading indicator while the preview is being computed', () => {
    previewState.previewLoading = true
    const view = render(<Harness />)
    expect(view.getByText(/Calculando disponibilidad en origen/i)).toBeDefined()
  })

  it('shows the source availability and normalized base quantity once the preview resolves', () => {
    previewState.preview = {
      source_on_hand: 100,
      source_reserved: 15,
      source_available: 85,
      entry_quantity: 25000,
      entry_uom: 'GR',
      base_quantity: 25,
      base_uom: 'KG',
      conversion_applies: true,
      conversion_factor: 0.001,
    }
    const view = render(<Harness />)
    expect(view.getByText(/Disponible en origen/i)).toBeDefined()
    expect(view.getByText('85')).toBeDefined()
    expect(view.getByText(/moverá/i)).toBeDefined()
  })

  it('surfaces a preview error instead of the availability line', () => {
    previewState.previewErrorMessage = 'No se pudo calcular la disponibilidad en origen'
    const view = render(<Harness />)
    expect(view.getByText('No se pudo calcular la disponibilidad en origen')).toBeDefined()
    expect(view.queryByText(/Disponible en origen/i)).toBeNull()
  })
})
