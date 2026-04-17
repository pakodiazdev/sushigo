import { Loader2 } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { useFormState, validators } from '@/hooks/use-form-state'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { useItemsSelect, useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'
import { itemVariantApi } from '@/services/inventory-api'
import type { ItemVariant, UnitOfMeasure, Item } from '@/types/inventory'

interface VariantFormProps {
  variant?: ItemVariant | null
  onSuccess: () => void
  onCancel: () => void
  preselectedItemId?: number
}

interface VariantFormData {
  item_id: number
  code: string
  name: string
  uom_id: number
  min_stock: number
  max_stock: number
  avg_unit_cost: number
  last_unit_cost: number
  is_active: boolean
}

export function VariantForm({ variant, onSuccess, onCancel, preselectedItemId }: VariantFormProps) {
  const isEditing = !!variant

  // Use shared query hooks
  const { data: items = [] } = useItemsSelect()
  const { data: units = [] } = useUnitsOfMeasureSelect()

  const { formData, setField, errors, validate } = useFormState<VariantFormData>({
    initialData: {
      item_id: variant?.item_id || preselectedItemId || 0,
      code: variant?.code || '',
      name: variant?.name || '',
      uom_id: variant?.uom_id || 0,
      min_stock: variant?.min_stock || 0,
      max_stock: variant?.max_stock || 100,
      avg_unit_cost: variant?.avg_unit_cost || 0,
      last_unit_cost: variant?.last_unit_cost || 0,
      is_active: variant?.is_active ?? true,
    },
    validationRules: {
      item_id: { required: true },
      code: {
        required: true,
        validate: validators.minLength(2, 'Code must be at least 2 characters'),
      },
      name: {
        required: true,
        validate: validators.minLength(2, 'Name must be at least 2 characters'),
      },
      uom_id: { required: true },
      min_stock: {
        validate: validators.positive('Min stock cannot be negative'),
      },
      max_stock: {
        validate: (value, data) => {
          if (typeof value === 'number' && typeof data.min_stock === 'number' && value < data.min_stock) {
            return 'Max stock must be greater than min stock'
          }
        },
      },
      last_unit_cost: {
        validate: validators.positive('Cost cannot be negative'),
      },
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: VariantFormData) => itemVariantApi.create(data),
    updateFn: (data: VariantFormData) => itemVariantApi.update(variant!.id, data),
    entityName: 'Variant',
    isEditing,
    onSuccess,
  })

  // Merge client and server validation errors
  const allErrors = { ...errors, ...validationErrors }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      await execute(formData)
    }
  }

  return (
    <>
      <SlidePanel.Header>
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Edit Variant' : 'New Variant'}
        </h2>
      </SlidePanel.Header>

      <SlidePanel.Body>
        <form id="variant-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Item Select */}
          <FormField
            label="Item"
            required
            error={allErrors.item_id}
          >
            <Select
              value={formData.item_id.toString()}
              onChange={(e) => setField('item_id', parseInt(e.target.value))}
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
              value={formData.code}
              onChange={(e) => setField('code', e.target.value.toUpperCase())}
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
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
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

          {/* Stock Levels */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Min Stock Level"
              required
              error={allErrors.min_stock}
            >
              <Input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setField('min_stock', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                error={!!allErrors.min_stock}
              />
            </FormField>

            <FormField
              label="Max Stock Level"
              required
              error={allErrors.max_stock}
            >
              <Input
                type="number"
                value={formData.max_stock}
                onChange={(e) => setField('max_stock', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                error={!!allErrors.max_stock}
              />
            </FormField>
          </div>

          {/* Cost */}
          <FormField
            label="Last Unit Cost"
            required
            error={allErrors.last_unit_cost}
            hint="Most recent purchase cost per unit"
          >
            <Input
              type="number"
              value={formData.last_unit_cost}
              onChange={(e) => setField('last_unit_cost', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!allErrors.last_unit_cost}
            />
          </FormField>

          {/* Active Status */}
          <FormField label="">
            <Checkbox
              checked={formData.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
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
