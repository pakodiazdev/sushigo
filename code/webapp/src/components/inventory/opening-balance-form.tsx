import { useState, useEffect } from 'react'
import { Loader2, DollarSign, Package } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { useFormState, validators } from '@/hooks/use-form-state'
import { useFormMutation } from '@/hooks/use-form-mutation'
import {
  useInventoryLocationsSelect,
  useItemVariantsSelect,
  useUnitsOfMeasureSelect,
} from '@/hooks/use-inventory-queries'
import { stockMovementApi } from '@/services/inventory-api'
import type { InventoryLocation, ItemVariant, UnitOfMeasure } from '@/types/inventory'

interface OpeningBalanceFormProps {
  onSuccess: () => void
  onCancel: () => void
  preselectedLocationId?: number
  preselectedVariantId?: number
}

interface OpeningBalanceFormData {
  inventory_location_id: number
  item_variant_id: number
  quantity: number
  uom_id: number
  unit_cost: number
  notes: string
}

export function OpeningBalanceForm({
  onSuccess,
  onCancel,
  preselectedLocationId,
  preselectedVariantId,
}: OpeningBalanceFormProps) {
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null)

  // Use shared query hooks
  const { data: locations = [] } = useInventoryLocationsSelect()
  const { data: variants = [] } = useItemVariantsSelect()
  const { data: units = [] } = useUnitsOfMeasureSelect()

  const { formData, setField, errors, validate } = useFormState<OpeningBalanceFormData>({
    initialData: {
      inventory_location_id: preselectedLocationId || 0,
      item_variant_id: preselectedVariantId || 0,
      quantity: 0,
      uom_id: 0,
      unit_cost: 0,
      notes: '',
    },
    validationRules: {
      inventory_location_id: { required: true },
      item_variant_id: { required: true },
      quantity: {
        validate: validators.greaterThan(0, 'Quantity must be greater than 0'),
      },
      uom_id: { required: true },
      unit_cost: {
        validate: validators.positive('Cost cannot be negative'),
      },
    },
  })

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (data: OpeningBalanceFormData) => stockMovementApi.openingBalance(data),
    successMessage: 'Opening balance registered successfully',
    successTitle: 'Stock Updated',
    errorMessageFallback: 'Failed to register opening balance',
    onSuccess,
  })

  // Merge client and server validation errors
  const allErrors = { ...errors, ...validationErrors }

  // Update UoM when variant changes
  useEffect(() => {
    if (formData.item_variant_id && variants.length > 0) {
      const variant = variants.find((v: ItemVariant) => v.id === formData.item_variant_id)
      if (variant) {
        setSelectedVariant(variant)
        setField('uom_id', variant.uom_id)
      }
    }
  }, [formData.item_variant_id, variants, setField])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      await execute(formData)
    }
  }

  // Calculate total cost
  const totalCost = formData.quantity * formData.unit_cost

  return (
    <>
      <SlidePanel.Header>
        <div>
          <h2 className="text-lg font-semibold">Register Opening Balance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add initial inventory to a location
          </p>
        </div>
      </SlidePanel.Header>

      <SlidePanel.Body>
        <form id="opening-balance-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Location Select */}
          <FormField label="Location" required error={allErrors.inventory_location_id}>
            <Select
              value={formData.inventory_location_id.toString()}
              onChange={(e) => setField('inventory_location_id', parseInt(e.target.value))}
            >
              <option value="0">Select location...</option>
              {locations.map((location: InventoryLocation) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </Select>
          </FormField>

          {/* Item Variant Select */}
          <FormField
            label="Item Variant"
            required
            error={allErrors.item_variant_id}
            hint="Select the product variant to add"
          >
            <Select
              value={formData.item_variant_id.toString()}
              onChange={(e) => setField('item_variant_id', parseInt(e.target.value))}
            >
              <option value="0">Select variant...</option>
              {variants.map((variant: ItemVariant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.code} - {variant.name}
                  {variant.item && ` (${variant.item.sku})`}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Selected Variant Info */}
          {selectedVariant && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Variant Info</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item:</span>
                  <span className="font-medium">
                    {selectedVariant.item?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default UoM:</span>
                  <span className="font-medium">
                    {selectedVariant.uom?.name || 'N/A'} ({selectedVariant.uom?.symbol})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Cost:</span>
                  <span className="font-medium">
                    ${selectedVariant.last_unit_cost?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          <FormField
            label="Quantity"
            required
            error={allErrors.quantity}
            hint="Amount to add to inventory"
          >
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => setField('quantity', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!allErrors.quantity}
            />
          </FormField>

          {/* Unit of Measure */}
          <FormField
            label="Unit of Measure"
            required
            error={allErrors.uom_id}
            hint="Auto-filled from variant's default UoM"
          >
            <Select
              value={formData.uom_id.toString()}
              onChange={(e) => setField('uom_id', parseInt(e.target.value))}
            >
              <option value="0">Select unit...</option>
              {units.map((uom: UnitOfMeasure) => (
                <option key={uom.id} value={uom.id}>
                  {uom.name} ({uom.symbol}) - {uom.type}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Unit Cost */}
          <FormField
            label="Unit Cost"
            required
            error={allErrors.unit_cost}
            hint="Cost per unit of measure"
          >
            <Input
              type="number"
              value={formData.unit_cost}
              onChange={(e) => setField('unit_cost', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!allErrors.unit_cost}
            />
          </FormField>

          {/* Total Cost Calculation */}
          {formData.quantity > 0 && formData.unit_cost > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">Total Cost</span>
                </div>
                <span className="text-2xl font-bold text-green-700">
                  ${totalCost.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {formData.quantity} × ${formData.unit_cost.toFixed(2)} per unit
              </div>
            </div>
          )}

          {/* Notes */}
          <FormField
            label="Notes"
            error={allErrors.notes}
            hint="Optional reference or comments"
          >
            <Textarea
              value={formData.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
              placeholder="e.g., Initial inventory count, Purchase order #12345..."
            />
          </FormField>
        </form>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            form="opening-balance-form"
            disabled={isPending}
            className="flex-1"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Register Opening Balance
          </Button>
        </div>
      </SlidePanel.Footer>
    </>
  )
}
