import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, TrendingUp, AlertCircle, Package } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { useToast } from '@/components/ui/toast-provider'
import { useFormMutation } from '@/hooks/use-form-mutation'
import {
  useInventoryLocationsSelect,
  useItemVariantsSelect,
  useUnitsOfMeasureSelect,
} from '@/hooks/use-inventory-queries'
import { stockMovementApi, stockApi } from '@/services/inventory-api'
import type { InventoryLocation, ItemVariant, Stock, UnitOfMeasure } from '@/types/inventory'

const stockOutSchema = z.object({
  location_id: z.number().min(1, 'This field is required'),
  variant_id: z.number().min(1, 'This field is required'),
  qty: z.number().gt(0, 'Quantity must be greater than 0'),
  uom_id: z.number().min(1, 'This field is required'),
  reason: z.enum(['SALE', 'CONSUMPTION']),
  sale_price: z.number().min(0, 'Sale price cannot be negative'),
  notes: z.string(),
}).refine((data) => {
  if (data.reason === 'SALE' && data.sale_price <= 0) {
    return false
  }
  return true
}, {
  message: 'Sale price is required for sales',
  path: ['sale_price'],
})

type StockOutFormValues = z.infer<typeof stockOutSchema>

interface StockOutFormProps {
  onSuccess: () => void
  onCancel: () => void
  preselectedLocationId?: number
  preselectedVariantId?: number
}

export function StockOutForm({
  onSuccess,
  onCancel,
  preselectedLocationId,
  preselectedVariantId,
}: StockOutFormProps) {
  const { showWarning, showSuccess } = useToast()
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null)
  const [variantStocks, setVariantStocks] = useState<Stock[]>([])

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
  } = useForm<StockOutFormValues>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      location_id: preselectedLocationId || 0,
      variant_id: preselectedVariantId || 0,
      qty: 0,
      uom_id: 0,
      reason: 'SALE',
      sale_price: 0,
      notes: '',
    },
  })

  // Watch values for controlled inputs and calculations
  const locationId = watch('location_id')
  const variantId = watch('variant_id')
  const uomId = watch('uom_id')
  const qty = watch('qty')
  const reason = watch('reason')
  const salePrice = watch('sale_price')

  // Fetch current stock for selected variant
  const { data: stockData } = useQuery({
    queryKey: ['stock-by-variant', variantId],
    queryFn: () => stockApi.byVariant(variantId),
    enabled: variantId > 0,
  })

  // Sort locations by priority (descending) and name
  const sortedLocations = [...locations].sort((a: InventoryLocation, b: InventoryLocation) => {
    const priorityA = a.priority ?? 0
    const priorityB = b.priority ?? 0
    if (priorityB !== priorityA) return priorityB - priorityA // Higher priority first
    return (a.name || '').localeCompare(b.name || '')
  })

  // Update variant info and UoM when variant changes
  useEffect(() => {
    if (variantId && variants.length > 0) {
      const variant = variants.find((v: ItemVariant) => v.id === variantId)
      if (variant) {
        setSelectedVariant(variant)
        setValue('uom_id', variant.uom_id)
      }
    }
  }, [variantId, variants, setValue])

  // Update stocks array when data arrives
  useEffect(() => {
    if (stockData?.data?.data) {
      setVariantStocks(stockData.data.data)
    }
  }, [stockData])

  // Derive the stock for the currently selected location
  const locationStock = variantStocks.find(
    (s) => s.inventory_location_id === locationId
  ) || null

  // Calculate profit (only for sales)
  const unitCost = selectedVariant?.last_unit_cost || 0
  const totalCost = qty * unitCost
  const totalRevenue = qty * salePrice
  const profitAmount = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? (profitAmount / totalRevenue) * 100 : 0

  const hasLowStock = !!(locationStock && locationStock.available < (selectedVariant?.min_stock || 0))
  const hasInsufficientStock = !!(locationStock && qty > locationStock.available)

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (data: StockOutFormValues) => stockMovementApi.stockOut(data),
    // No successMessage — toast logic is conditional and handled in onSuccess
    errorMessageFallback: 'Failed to register stock out',
    onSuccess: () => {
      const isSale = reason === 'SALE'
      const profitAmt = isSale ? totalRevenue - totalCost : 0

      if (isSale && profitAmt < 0) {
        showWarning(
          `Stock out registered, but sale resulted in negative profit: $${Math.abs(profitAmt).toFixed(2)}`,
          'Sale at Loss'
        )
      } else {
        showSuccess(
          isSale ? 'Stock sale registered successfully' : 'Stock consumption registered successfully',
          'Success'
        )
      }
      onSuccess()
    },
  })

  // Merge client and server validation errors
  const allErrors = {
    location_id: errors.location_id?.message || validationErrors.location_id,
    variant_id: errors.variant_id?.message || validationErrors.variant_id,
    qty: errors.qty?.message || validationErrors.qty,
    uom_id: errors.uom_id?.message || validationErrors.uom_id,
    reason: errors.reason?.message || validationErrors.reason,
    sale_price: errors.sale_price?.message || validationErrors.sale_price,
    notes: errors.notes?.message || validationErrors.notes,
  }

  const onSubmit = async (data: StockOutFormValues) => {
    // Custom validation for stock availability
    if (locationStock && data.qty > locationStock.available) {
      return
    }
    await execute(data)
  }

  return (
    <>
      <SlidePanel.Header>
        <div>
          <h2 className="text-lg font-semibold">Register Stock Out</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Remove inventory from location (sale or consumption)
          </p>
        </div>
      </SlidePanel.Header>

      <SlidePanel.Body>
        <form id="stock-out-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Location Select */}
          <FormField label="Location" required error={allErrors.location_id}>
            <Select
              value={(locationId ?? 0).toString()}
              onChange={(e) => setValue('location_id', Number.parseInt(e.target.value))}
            >
              <option value="0">Select location...</option>
              {sortedLocations.map((location: InventoryLocation) => (
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
            error={allErrors.variant_id}
            hint="Select the product variant to remove"
          >
            <Select
              value={(variantId ?? 0).toString()}
              onChange={(e) => setValue('variant_id', Number.parseInt(e.target.value))}
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

          {/* Current Stock Info */}
          {locationStock && selectedVariant && (
            <div
              className={`border rounded-lg p-3 text-sm ${hasInsufficientStock
                ? 'bg-red-50 border-red-200'
                : hasLowStock
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
                }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {hasInsufficientStock ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <Package className="h-4 w-4 text-blue-600" />
                )}
                <span
                  className={`font-semibold ${hasInsufficientStock
                    ? 'text-red-900'
                    : hasLowStock
                      ? 'text-yellow-900'
                      : 'text-blue-900'
                    }`}
                >
                  Current Stock
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">On Hand</div>
                  <div className="font-semibold">{locationStock.on_hand || 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reserved</div>
                  <div className="font-semibold">{locationStock.reserved || 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Available</div>
                  <div
                    className={`font-semibold ${hasLowStock ? 'text-yellow-700' : 'text-green-600'
                      }`}
                  >
                    {locationStock.available || 0}
                  </div>
                </div>
              </div>
              {hasLowStock && !hasInsufficientStock && (
                <div className="text-xs text-yellow-700 mt-2">
                  ⚠️ Stock below minimum level ({selectedVariant.min_stock})
                </div>
              )}
              {hasInsufficientStock && (
                <div className="text-xs text-red-700 mt-2 font-medium">
                  ❌ Insufficient stock for this operation
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <FormField
            label="Quantity"
            required
            error={allErrors.qty || (hasInsufficientStock ? `Only ${locationStock?.available || 0} units available` : undefined)}
            hint="Amount to remove from inventory"
          >
            <Input
              type="number"
              {...register('qty', { valueAsNumber: true })}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!allErrors.qty || hasInsufficientStock}
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
              value={(uomId ?? 0).toString()}
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

          {/* Reason */}
          <FormField label="Reason" required error={allErrors.reason}>
            <Select
              value={reason}
              onChange={(e) => setValue('reason', e.target.value as 'SALE' | 'CONSUMPTION')}
            >
              <option value="SALE">Sale (revenue generating)</option>
              <option value="CONSUMPTION">Consumption (internal use)</option>
            </Select>
          </FormField>

          {/* Sale Price (only for SALE) */}
          {reason === 'SALE' && (
            <FormField
              label="Sale Price per Unit"
              required
              error={allErrors.sale_price}
              hint="Selling price per unit of measure"
            >
              <Input
                type="number"
                {...register('sale_price', { valueAsNumber: true })}
                min="0"
                step="0.01"
                placeholder="0.00"
                error={!!allErrors.sale_price}
              />
            </FormField>
          )}

          {/* Profit Calculation (only for SALE) */}
          {reason === 'SALE' &&
            qty > 0 &&
            salePrice > 0 &&
            selectedVariant && (
              <div
                className={`border rounded-lg p-4 ${profitAmount >= 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      className={`h-5 w-5 ${profitAmount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                    />
                    <span
                      className={`font-semibold ${profitAmount >= 0 ? 'text-green-900' : 'text-red-900'
                        }`}
                    >
                      Profit Analysis
                    </span>
                  </div>
                  <span
                    className={`text-sm px-2 py-1 rounded ${profitAmount >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {profitMargin.toFixed(1)}% margin
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span className="font-medium">${totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-medium">
                      ${totalCost.toFixed(2)}
                      <span className="text-xs ml-1">
                        (${unitCost.toFixed(2)}/unit)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold">Net Profit:</span>
                    <span
                      className={`font-bold text-lg ${profitAmount >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}
                    >
                      ${profitAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* Notes */}
          <FormField label="Notes" error={allErrors.notes} hint="Optional reference or comments">
            <Textarea
              {...register('notes')}
              rows={3}
              placeholder="e.g., Sale order #12345, Kitchen consumption..."
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
            form="stock-out-form"
            disabled={isPending || hasInsufficientStock}
            className="flex-1"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Register Stock Out
          </Button>
        </div>
      </SlidePanel.Footer>
    </>
  )
}
