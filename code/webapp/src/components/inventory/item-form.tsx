import { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useFormState, validators } from '@/hooks/use-form-state'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { itemApi } from '@/services/inventory-api'
import type { Item } from '@/types/inventory'

interface ItemFormProps {
  item?: Item | null
  onSuccess: () => void
  onCancel: () => void
}

interface ItemFormData {
  sku: string
  name: string
  description: string
  type: 'INSUMO' | 'PRODUCTO' | 'ACTIVO'
  is_stocked: boolean
  is_perishable: boolean
  is_active: boolean
}

export function ItemForm({ item, onSuccess, onCancel }: ItemFormProps) {
  const isEditing = !!item

  const { formData, setField, errors, validate } = useFormState<ItemFormData>({
    initialData: {
      sku: item?.sku || '',
      name: item?.name || '',
      description: item?.description || '',
      type: item?.type || 'INSUMO',
      is_stocked: item?.is_stocked ?? true,
      is_perishable: item?.is_perishable ?? false,
      is_active: item?.is_active ?? true,
    },
    validationRules: {
      sku: {
        required: true,
        validate: validators.minLength(2, 'SKU must be at least 2 characters'),
      },
      name: {
        required: true,
        validate: validators.minLength(3, 'Name must be at least 3 characters'),
      },
      type: { required: true },
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: ItemFormData) => itemApi.create(data),
    updateFn: (data: ItemFormData) => itemApi.update(item!.id, data),
    entityName: 'Item',
    isEditing,
    onSuccess,
  })

  // Merge client and server validation errors
  const allErrors = { ...errors, ...validationErrors }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    await execute(formData)
  }

  const isSubmitting = isPending

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField
          label="SKU (Stock Keeping Unit)"
          required
          error={allErrors.sku}
          hint="Unique identifier for this item"
        >
          <Input
            value={formData.sku}
            onChange={(e) => setField('sku', e.target.value.toUpperCase())}
            placeholder="e.g., SAL-001"
            error={!!allErrors.sku}
            disabled={isEditing} // SKU can't be changed after creation
          />
        </FormField>

        <FormField
          label="Item Name"
          required
          error={allErrors.name}
        >
          <Input
            value={formData.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g., Fresh Salmon"
            error={!!allErrors.name}
          />
        </FormField>

        <FormField
          label="Type"
          required
          error={allErrors.type}
          hint="Classification type for this item"
        >
          <Select
            value={formData.type}
            onChange={(e) => setField('type', e.target.value as ItemFormData['type'])}
            error={!!allErrors.type}
          >
            <option value="INSUMO">Insumo (Input/Raw Material)</option>
            <option value="PRODUCTO">Producto (Finished Product)</option>
            <option value="ACTIVO">Activo (Asset)</option>
          </Select>
        </FormField>

        <FormField label="Description">
          <Textarea
            value={formData.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={3}
            placeholder="Additional description or notes"
          />
        </FormField>

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900">Item Properties</h4>

          <Checkbox
            checked={formData.is_stocked}
            onChange={(e) => setField('is_stocked', e.target.checked)}
            label="Track inventory for this item"
          />

          <Checkbox
            checked={formData.is_perishable}
            onChange={(e) => setField('is_perishable', e.target.checked)}
            label="Perishable (has expiration date)"
          />

          <Checkbox
            checked={formData.is_active}
            onChange={(e) => setField('is_active', e.target.checked)}
            label="Active"
          />
        </div>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Item
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
