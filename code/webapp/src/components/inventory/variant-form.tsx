import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { useToast } from '@/components/ui/toast-provider'
import { itemVariantApi, itemApi } from '@/services/inventory-api'
import { apiClient } from '@/lib/api-client'
import type { ItemVariant } from '@/types/inventory'

interface VariantFormProps {
  variant?: ItemVariant | null
  onSuccess: () => void
  onCancel: () => void
  preselectedItemId?: number
}

export function VariantForm({ variant, onSuccess, onCancel, preselectedItemId }: VariantFormProps) {
  const { showSuccess, showError } = useToast()
  const isEditing = !!variant

  const [formData, setFormData] = useState({
    item_id: variant?.item_id || preselectedItemId || 0,
    code: variant?.code || '',
    name: variant?.name || '',
    uom_id: variant?.uom_id || 0,
    min_stock: variant?.min_stock || 0,
    max_stock: variant?.max_stock || 100,
    avg_unit_cost: variant?.avg_unit_cost || 0,
    last_unit_cost: variant?.last_unit_cost || 0,
    is_active: variant?.is_active ?? true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch items for select
  const { data: itemsData } = useQuery({
    queryKey: ['items-for-select'],
    queryFn: () => itemApi.list({ is_active: true, per_page: 100 }),
  })

  // Fetch units of measure
  const { data: uomData } = useQuery({
    queryKey: ['units-of-measure'],
    queryFn: async () => {
      const response = await apiClient.get('/units-of-measure', { 
        params: { is_active: true, per_page: 100 } 
      })
      return response
    },
  })

  const items = itemsData?.data.data || []
  const units = uomData?.data.data || []

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (isEditing && variant) {
        return itemVariantApi.update(variant.id, data)
      }
      return itemVariantApi.create(data)
    },
    onSuccess: () => {
      showSuccess(
        `Variant ${isEditing ? 'updated' : 'created'} successfully`,
        isEditing ? 'Variant Updated' : 'Variant Created'
      )
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} variant`,
        'Error'
      )
    },
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.item_id || formData.item_id === 0) {
      newErrors.item_id = 'Item is required'
    }
    if (!formData.code || formData.code.length < 2) {
      newErrors.code = 'Code must be at least 2 characters'
    }
    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }
    if (!formData.uom_id || formData.uom_id === 0) {
      newErrors.uom_id = 'Unit of measure is required'
    }
    if (formData.min_stock < 0) {
      newErrors.min_stock = 'Min stock cannot be negative'
    }
    if (formData.max_stock < formData.min_stock) {
      newErrors.max_stock = 'Max stock must be greater than min stock'
    }
    if (formData.last_unit_cost < 0) {
      newErrors.last_unit_cost = 'Cost cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      mutation.mutate(formData)
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
            error={errors.item_id}
          >
            <Select
              value={formData.item_id.toString()}
              onChange={(e) => setFormData({ ...formData, item_id: parseInt(e.target.value) })}
              disabled={isEditing}
            >
              <option value="0">Select an item...</option>
              {items.map((item) => (
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
            error={errors.code}
            hint="Unique code for this variant (e.g., SKU-001-L, PROD-KG)"
          >
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., PROD-KG"
              error={!!errors.code}
            />
          </FormField>

          {/* Name */}
          <FormField
            label="Variant Name"
            required
            error={errors.name}
            hint="Descriptive name (e.g., Large, 1 Kilogram, 500ml)"
          >
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 1 Kilogram"
              error={!!errors.name}
            />
          </FormField>

          {/* Unit of Measure */}
          <FormField
            label="Unit of Measure"
            required
            error={errors.uom_id}
          >
            <Select
              value={formData.uom_id.toString()}
              onChange={(e) => setFormData({ ...formData, uom_id: parseInt(e.target.value) })}
            >
              <option value="0">Select unit...</option>
              {units.map((uom: any) => (
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
              error={errors.min_stock}
            >
              <Input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                error={!!errors.min_stock}
              />
            </FormField>

            <FormField
              label="Max Stock Level"
              required
              error={errors.max_stock}
            >
              <Input
                type="number"
                value={formData.max_stock}
                onChange={(e) => setFormData({ ...formData, max_stock: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                error={!!errors.max_stock}
              />
            </FormField>
          </div>

          {/* Cost */}
          <FormField
            label="Last Unit Cost"
            required
            error={errors.last_unit_cost}
            hint="Most recent purchase cost per unit"
          >
            <Input
              type="number"
              value={formData.last_unit_cost}
              onChange={(e) => setFormData({ ...formData, last_unit_cost: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!errors.last_unit_cost}
            />
          </FormField>

          {/* Active Status */}
          <FormField label="">
            <Checkbox
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
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
            disabled={mutation.isPending}
            className="flex-1"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </SlidePanel.Footer>
    </>
  )
}
