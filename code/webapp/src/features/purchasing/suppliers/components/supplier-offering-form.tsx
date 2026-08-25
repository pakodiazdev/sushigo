import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, FormField, Select } from '@/components/ui/form-fields'
import { Input } from '@/components/ui/input'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useSupplierOfferingForm } from '../hooks/use-supplier-offering-form'
import type { SupplierOffering } from '../types'

interface SupplierOfferingFormProps {
  supplierId: string
  offering?: SupplierOffering | null
  onSuccess: () => void
  onCancel: () => void
}

export function SupplierOfferingForm({ supplierId, offering, onSuccess, onCancel }: Readonly<SupplierOfferingFormProps>) {
  const {
    isEditing,
    productId,
    variantId,
    products,
    variants,
    presentations,
    register,
    handleSubmit,
    setValue,
    onProductChange,
    onVariantChange,
    onSubmit,
    allErrors,
    isActive,
    isSubmitting,
  } = useSupplierOfferingForm({ supplierId, offering, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-5">
        <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Esta cotización es una referencia comercial; no registra el costo real de adquisición.</p>
        </div>
        {isEditing ? (
          <FormField label="Presentación">
            <p className="rounded-md border bg-muted px-3 py-2 text-sm">
              {offering?.presentation.variant?.product?.name ?? 'Producto no disponible'} · {offering?.presentation.variant?.name ?? 'Variante no disponible'} · {offering?.presentation.template?.name ?? 'Presentación no disponible'}
            </p>
          </FormField>
        ) : (
          <>
            <FormField label="Producto" required>
              <Select aria-label="Producto" value={productId} onChange={(event) => onProductChange(event.target.value)}>
                <option value="">Selecciona un producto</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Variante" required>
              <Select aria-label="Variante" value={variantId} disabled={!productId} onChange={(event) => onVariantChange(event.target.value)}>
                <option value="">Selecciona una variante</option>
                {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} ({variant.code})</option>)}
              </Select>
            </FormField>
            <FormField label="Presentación de compra" required error={allErrors.variant_purchase_presentation_id}>
              <Select aria-label="Presentación de compra" {...register('variant_purchase_presentation_id')} disabled={!variantId} error={Boolean(allErrors.variant_purchase_presentation_id)}>
                <option value="">Selecciona una presentación</option>
                {presentations.map((presentation) => (
                  <option key={presentation.id} value={presentation.id}>{presentation.template?.name ?? 'Sin plantilla'}</option>
                ))}
              </Select>
            </FormField>
          </>
        )}
        <FormField label="Código del producto según el proveedor" error={allErrors.supplier_code}>
          <Input aria-label="Código del producto según el proveedor" {...register('supplier_code')} error={Boolean(allErrors.supplier_code)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio cotizado" required error={allErrors.quoted_price}>
            <Input aria-label="Precio cotizado" type="number" step="0.0001" {...register('quoted_price', { valueAsNumber: true })} error={Boolean(allErrors.quoted_price)} />
          </FormField>
          <FormField label="Moneda" required error={allErrors.currency}>
            <Input aria-label="Moneda" maxLength={3} {...register('currency')} error={Boolean(allErrors.currency)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Vigente desde" error={allErrors.valid_from}>
            <Input aria-label="Vigente desde" type="date" {...register('valid_from')} />
          </FormField>
          <FormField label="Vigente hasta" error={allErrors.valid_until}>
            <Input aria-label="Vigente hasta" type="date" {...register('valid_until')} error={Boolean(allErrors.valid_until)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cantidad mínima" required error={allErrors.minimum_order_quantity}>
            <Input aria-label="Cantidad mínima" type="number" step="0.0001" {...register('minimum_order_quantity', { valueAsNumber: true })} error={Boolean(allErrors.minimum_order_quantity)} />
          </FormField>
          <FormField label="Entrega (días)" error={allErrors.lead_time_days}>
            <Input aria-label="Entrega (días)" type="number" {...register('lead_time_days', { valueAsNumber: true })} error={Boolean(allErrors.lead_time_days)} />
          </FormField>
        </div>
        <Checkbox id="offering-active" checked={isActive} onChange={(event) => setValue('is_active', event.target.checked)} label="Oferta activa" />
      </SlidePanel.Body>
      <SlidePanel.Footer>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} oferta
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
