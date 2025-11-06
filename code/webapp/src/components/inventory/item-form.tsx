import { useState, FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useToast } from '@/components/ui/toast-provider'
import { itemApi } from '@/services/inventory-api'
import type { Item } from '@/types/inventory'

interface ItemFormProps {
  item?: Item | null
  onSuccess: () => void
  onCancel: () => void
}

export function ItemForm({ item, onSuccess, onCancel }: ItemFormProps) {
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    sku: item?.sku || '',
    name: item?.name || '',
    description: item?.description || '',
    type: item?.type || 'INSUMO' as const,
    is_stocked: item?.is_stocked ?? true,
    is_perishable: item?.is_perishable ?? false,
    is_active: item?.is_active ?? true,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => itemApi.create(data),
    onSuccess: () => {
      showSuccess(
        'Item created successfully',
        'Item Created'
      )
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Failed to create item',
        'Error'
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      itemApi.update(item!.id, data),
    onSuccess: () => {
      showSuccess(
        'Item updated successfully',
        'Item Updated'
      )
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Failed to update item',
        'Error'
      )
    },
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.sku || formData.sku.length < 2) {
      newErrors.sku = 'SKU must be at least 2 characters'
    }
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters'
    }
    if (!formData.type) {
      newErrors.type = 'Type is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    try {
      if (item) {
        await updateMutation.mutateAsync(formData)
      } else {
        await createMutation.mutateAsync(formData)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const mutation = item ? updateMutation : createMutation
  const isSubmitting = mutation.isPending

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField
          label="SKU (Stock Keeping Unit)"
          required
          error={errors.sku}
          hint="Unique identifier for this item"
        >
          <Input
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
            placeholder="e.g., SAL-001"
            error={!!errors.sku}
            disabled={!!item} // SKU can't be changed after creation
          />
        </FormField>

        <FormField
          label="Item Name"
          required
          error={errors.name}
        >
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Fresh Salmon"
            error={!!errors.name}
          />
        </FormField>

        <FormField
          label="Type"
          required
          error={errors.type}
          hint="Classification type for this item"
        >
          <Select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            error={!!errors.type}
          >
            <option value="INSUMO">Insumo (Input/Raw Material)</option>
            <option value="PRODUCTO">Producto (Finished Product)</option>
            <option value="ACTIVO">Activo (Asset)</option>
          </Select>
        </FormField>

        <FormField label="Description">
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Additional description or notes"
          />
        </FormField>

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900">Item Properties</h4>
          
          <Checkbox
            checked={formData.is_stocked}
            onChange={(e) => setFormData({ ...formData, is_stocked: e.target.checked })}
            label="Track inventory for this item"
          />
          
          <Checkbox
            checked={formData.is_perishable}
            onChange={(e) => setFormData({ ...formData, is_perishable: e.target.checked })}
            label="Perishable (has expiration date)"
          />
          
          <Checkbox
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
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
            {item ? 'Update' : 'Create'} Item
          </Button>
        </div>

        {mutation.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'An error occurred while saving the item'}
            </p>
          </div>
        )}
      </SlidePanel.Footer>
    </form>
  )
}
