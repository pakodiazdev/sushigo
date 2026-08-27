import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { useItemsSelect, useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'
import { itemVariantApi } from '@/services/inventory-api'
import type { ItemVariant, UnitOfMeasure, Item } from '@/types/inventory'

const variantSchema = z.object({
  item_id: z.number().min(1, 'This field is required'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  uom_id: z.number().min(1, 'This field is required'),
  avg_unit_cost: z.number(),
  last_unit_cost: z.number().min(0, 'Cost cannot be negative'),
  is_active: z.boolean(),
})

type VariantFormValues = z.infer<typeof variantSchema>

interface VariantFormProps {
  variant?: ItemVariant | null
  onSuccess: () => void
  onCancel: () => void
  preselectedItemId?: number
}

export function VariantForm({ variant, onSuccess, onCancel, preselectedItemId }: Readonly<VariantFormProps>) {
  const isEditing = !!variant

  // Use shared query hooks
  const { data: items = [] } = useItemsSelect()
  const { data: units = [] } = useUnitsOfMeasureSelect()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      item_id: variant?.item_id || preselectedItemId || 0,
      code: variant?.code || '',
      name: variant?.name || '',
      uom_id: variant?.uom_id || 0,
      avg_unit_cost: variant?.avg_unit_cost || 0,
      last_unit_cost: variant?.last_unit_cost || 0,
      is_active: variant?.is_active ?? true,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: VariantFormValues) => itemVariantApi.create(data),
    updateFn: (data: VariantFormValues) => itemVariantApi.update(variant!.id, data),
    entityName: 'Variant',
    isEditing,
    onSuccess,
  })

  // Merge client and server validation errors
  const allErrors = {
    item_id: errors.item_id?.message || validationErrors.item_id,
    code: errors.code?.message || validationErrors.code,
    name: errors.name?.message || validationErrors.name,
    uom_id: errors.uom_id?.message || validationErrors.uom_id,
    last_unit_cost: errors.last_unit_cost?.message || validationErrors.last_unit_cost,
  }

  const onSubmit = async (data: VariantFormValues) => {
    await execute(data)
  }

  // Watch values for controlled inputs
  const itemId = watch('item_id')
  const uomId = watch('uom_id')
  const isActive = watch('is_active')

  return (
    <>
      <SlidePanel.Header>
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Edit Variant' : 'New Variant'}
        </h2>
      </SlidePanel.Header>

      <SlidePanel.Body>
        <form id="variant-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Item Select */}
          <FormField
            label="Item"
            required
            error={allErrors.item_id}
          >
            <Select
              value={itemId.toString()}
              onChange={(e) => setValue('item_id', Number.parseInt(e.target.value))}
              disabled={isEditing}
            >
              <option value="0">Select an item...</option>
              {items.map((item: Item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Code */}
          <FormField
            label="Variant Code"
            required
            error={allErrors.code}
            hint="Unique code for this variant (e.g., SKU-001-L, PROD-KG)"
          >
            <Input
              {...register('code', {
                onChange: (e) => setValue('code', e.target.value.toUpperCase()),
              })}
              placeholder="e.g., PROD-KG"
              error={!!allErrors.code}
            />
          </FormField>

          {/* Name */}
          <FormField
            label="Variant Name"
            required
            error={allErrors.name}
            hint="Descriptive name (e.g., Large, 1 Kilogram, 500ml)"
          >
            <Input
              {...register('name')}
              placeholder="e.g., 1 Kilogram"
              error={!!allErrors.name}
            />
          </FormField>

          {/* Unit of Measure */}
          <FormField
            label="Unit of Measure"
            required
            error={allErrors.uom_id}
          >
            <Select
              value={uomId.toString()}
              onChange={(e) => setValue('uom_id', Number.parseInt(e.target.value))}
            >
              <option value="0">Select unit...</option>
              {units.map((uom: UnitOfMeasure) => (
                <option key={uom.id} value={uom.id}>
                  {uom.name} ({uom.symbol}) - {uom.type}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Replenishment thresholds are configured per Inventory Location (#439) —
              see the Stock Dashboard's per-location "Replenishment thresholds" panel. */}

          {/* Cost */}
          <FormField
            label="Last Unit Cost"
            required
            error={allErrors.last_unit_cost}
            hint="Most recent purchase cost per unit"
          >
            <Input
              type="number"
              {...register('last_unit_cost', { valueAsNumber: true })}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!allErrors.last_unit_cost}
            />
          </FormField>

          {/* Active Status */}
          <FormField label="">
            <Checkbox
              checked={isActive}
              onChange={(e) => setValue('is_active', e.target.checked)}
              label="Active"
            />
          </FormField>
        </form>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="variant-form"
            disabled={isPending}
            className="flex-1"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </SlidePanel.Footer>
    </>
  )
}
