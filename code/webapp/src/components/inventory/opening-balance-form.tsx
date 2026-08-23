import { useState, useEffect } from 'react'
import { Loader2, DollarSign, Package } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { useFormMutation } from '@/hooks/use-form-mutation'
import {
  useInventoryLocationsSelect,
  useItemVariantsSelect,
  useUnitsOfMeasureSelect,
} from '@/hooks/use-inventory-queries'
import { stockMovementApi } from '@/services/inventory-api'
import type { InventoryLocation, ItemVariant } from '@/types/inventory'
import { UnitOfMeasureSelectField, VariantSelectField } from './stock-reference-fields'

const openingBalanceSchema = z.object({
  inventory_location_id: z.string().min(1, 'This field is required'),
  item_variant_id: z.string().min(1, 'This field is required'),
  quantity: z.number().gt(0, 'Quantity must be greater than 0'),
  uom_id: z.string().min(1, 'This field is required'),
  unit_cost: z.number().min(0, 'Cost cannot be negative'),
  notes: z.string(),
})

type OpeningBalanceFormValues = z.infer<typeof openingBalanceSchema>

interface OpeningBalanceFormProps {
  onSuccess: () => void
  onCancel: () => void
  preselectedLocationId?: string
  preselectedVariantId?: string
}

export function OpeningBalanceForm({
  onSuccess,
  onCancel,
  preselectedLocationId,
  preselectedVariantId,
}: Readonly<OpeningBalanceFormProps>) {
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null)

  // Use shared query hooks
  const { data: locations = [] } = useInventoryLocationsSelect()
  const { data: variants = [] } = useItemVariantsSelect()
  const { data: units = [] } = useUnitsOfMeasureSelect()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OpeningBalanceFormValues>({
    resolver: zodResolver(openingBalanceSchema),
    defaultValues: {
      inventory_location_id: preselectedLocationId || '',
      item_variant_id: preselectedVariantId || '',
      quantity: 0,
      uom_id: '',
      unit_cost: 0,
      notes: '',
    },
  })

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (data: OpeningBalanceFormValues) => stockMovementApi.openingBalance(data),
    successMessage: 'Opening balance registered successfully',
    successTitle: 'Stock Updated',
    errorMessageFallback: 'Failed to register opening balance',
    onSuccess,
  })

  // Merge client and server validation errors
  const allErrors = {
    inventory_location_id: errors.inventory_location_id?.message || validationErrors.inventory_location_id,
    item_variant_id: errors.item_variant_id?.message || validationErrors.item_variant_id,
    quantity: errors.quantity?.message || validationErrors.quantity,
    uom_id: errors.uom_id?.message || validationErrors.uom_id,
    unit_cost: errors.unit_cost?.message || validationErrors.unit_cost,
    notes: errors.notes?.message || validationErrors.notes,
  }

  // Watch values for controlled inputs and calculations
  const itemVariantId = watch('item_variant_id')
  const inventoryLocationId = watch('inventory_location_id')
  const uomId = watch('uom_id')
  const quantity = watch('quantity')
  const unitCost = watch('unit_cost')

  // Update UoM when variant changes
  useEffect(() => {
    if (itemVariantId && variants.length > 0) {
      const variant = variants.find((v: ItemVariant) => v.id === itemVariantId)
      if (variant) {
        setSelectedVariant(variant)
        setValue('uom_id', variant.uom?.id ?? '')
      }
    }
  }, [itemVariantId, variants, setValue])

  const onSubmit = async (data: OpeningBalanceFormValues) => {
    await execute(data)
  }

  // Calculate total cost
  const totalCost = quantity * unitCost

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
        <form id="opening-balance-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Location Select */}
          <FormField label="Location" required error={allErrors.inventory_location_id}>
            <Select
              value={inventoryLocationId}
              onChange={(e) => setValue('inventory_location_id', e.target.value)}
            >
              <option value="">Select location...</option>
              {locations.map((location: InventoryLocation) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </Select>
          </FormField>

          {/* Item Variant Select */}
          <VariantSelectField
            value={itemVariantId}
            error={allErrors.item_variant_id}
            hint="Select the product variant to add"
            variants={variants}
            onChange={(value) => setValue('item_variant_id', value)}
          />

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
              {...register('quantity', { valueAsNumber: true })}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!allErrors.quantity}
            />
          </FormField>

          {/* Unit of Measure */}
          <UnitOfMeasureSelectField
            value={uomId}
            error={allErrors.uom_id}
            units={units}
            onChange={(value) => setValue('uom_id', value)}
          />

          {/* Unit Cost */}
          <FormField
            label="Unit Cost"
            required
            error={allErrors.unit_cost}
            hint="Cost per unit of measure"
          >
            <Input
              type="number"
              {...register('unit_cost', { valueAsNumber: true })}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!allErrors.unit_cost}
            />
          </FormField>

          {/* Total Cost Calculation */}
          {quantity > 0 && unitCost > 0 && (
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
                {quantity} × ${unitCost.toFixed(2)} per unit
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
              {...register('notes')}
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
