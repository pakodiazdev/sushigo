import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, DollarSign, Package } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { useToast } from '@/components/ui/toast-provider'
import { inventoryLocationApi, itemVariantApi, stockMovementApi } from '@/services/inventory-api'
import axios from 'axios'

interface OpeningBalanceFormProps {
  onSuccess: () => void
  onCancel: () => void
  preselectedLocationId?: number
  preselectedVariantId?: number
}

export function OpeningBalanceForm({
  onSuccess,
  onCancel,
  preselectedLocationId,
  preselectedVariantId,
}: OpeningBalanceFormProps) {
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    inventory_location_id: preselectedLocationId || 0,
    item_variant_id: preselectedVariantId || 0,
    quantity: 0,
    uom_id: 0,
    unit_cost: 0,
    notes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedVariant, setSelectedVariant] = useState<any>(null)

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['inventory-locations-for-select'],
    queryFn: () => inventoryLocationApi.list({ is_active: true, per_page: 100 }),
  })

  // Fetch variants
  const { data: variantsData } = useQuery({
    queryKey: ['item-variants-for-select'],
    queryFn: () => itemVariantApi.list({ is_active: true, per_page: 200 }),
  })

  // Fetch units of measure
  const { data: uomData } = useQuery({
    queryKey: ['units-of-measure-for-select'],
    queryFn: async () => {
      const api = axios.create({
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
      })
      const response = await api.get('/units-of-measure', {
        params: { is_active: true, per_page: 100 },
      })
      return response
    },
  })

  const locations = locationsData?.data.data || []
  const variants = variantsData?.data.data || []
  const units = uomData?.data.data || []

  // Update UoM when variant changes
  useEffect(() => {
    if (formData.item_variant_id && variants.length > 0) {
      const variant = variants.find((v: any) => v.id === formData.item_variant_id)
      if (variant) {
        setSelectedVariant(variant)
        setFormData((prev) => ({ ...prev, uom_id: variant.uom_id }))
      }
    }
  }, [formData.item_variant_id, variants])

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => stockMovementApi.openingBalance(data),
    onSuccess: () => {
      showSuccess(
        'Opening balance registered successfully',
        'Stock Updated'
      )
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Failed to register opening balance',
        'Error'
      )
    },
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.inventory_location_id || formData.inventory_location_id === 0) {
      newErrors.inventory_location_id = 'Location is required'
    }
    if (!formData.item_variant_id || formData.item_variant_id === 0) {
      newErrors.item_variant_id = 'Item variant is required'
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }
    if (!formData.uom_id || formData.uom_id === 0) {
      newErrors.uom_id = 'Unit of measure is required'
    }
    if (formData.unit_cost < 0) {
      newErrors.unit_cost = 'Cost cannot be negative'
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
          <FormField label="Location" required error={errors.inventory_location_id}>
            <Select
              value={formData.inventory_location_id.toString()}
              onChange={(e) =>
                setFormData({ ...formData, inventory_location_id: parseInt(e.target.value) })
              }
            >
              <option value="0">Select location...</option>
              {locations.map((location: any) => (
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
            error={errors.item_variant_id}
            hint="Select the product variant to add"
          >
            <Select
              value={formData.item_variant_id.toString()}
              onChange={(e) =>
                setFormData({ ...formData, item_variant_id: parseInt(e.target.value) })
              }
            >
              <option value="0">Select variant...</option>
              {variants.map((variant: any) => (
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
            error={errors.quantity}
            hint="Amount to add to inventory"
          >
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!errors.quantity}
            />
          </FormField>

          {/* Unit of Measure */}
          <FormField
            label="Unit of Measure"
            required
            error={errors.uom_id}
            hint="Auto-filled from variant's default UoM"
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

          {/* Unit Cost */}
          <FormField
            label="Unit Cost"
            required
            error={errors.unit_cost}
            hint="Cost per unit of measure"
          >
            <Input
              type="number"
              value={formData.unit_cost}
              onChange={(e) =>
                setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!errors.unit_cost}
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
            error={errors.notes}
            hint="Optional reference or comments"
          >
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
            disabled={mutation.isPending}
            className="flex-1"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Register Opening Balance
          </Button>
        </div>
      </SlidePanel.Footer>
    </>
  )
}
