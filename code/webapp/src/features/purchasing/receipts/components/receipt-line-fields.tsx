import { Trash2 } from 'lucide-react'
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormField, Select } from '@/components/ui/form-fields'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/format'
import { useReceiptLineFields } from '../hooks/use-receipt-line-fields'
import type { ReceiptFormValues } from '../hooks/use-receipt-form'
import { computeReceiptLineTotals } from '../lib/compute-receipt-line-totals'

interface ReceiptLineFieldsProps {
  index: number
  supplierId: string
  register: UseFormRegister<ReceiptFormValues>
  watch: UseFormWatch<ReceiptFormValues>
  setValue: UseFormSetValue<ReceiptFormValues>
  errors: FieldErrors<ReceiptFormValues>
  validationErrors: Record<string, string>
  onRemove: () => void
  canRemove: boolean
}

export function ReceiptLineFields({
  index,
  supplierId,
  register,
  watch,
  setValue,
  errors,
  validationErrors,
  onRemove,
  canRemove,
}: Readonly<ReceiptLineFieldsProps>) {
  const isNew = watch(`lines.${index}._isNew`)
  const label = watch(`lines.${index}._label`)
  const presentationId = watch(`lines.${index}.variant_purchase_presentation_id`)
  const presentationFactor = watch(`lines.${index}.presentation_factor`) || 0
  const receivedPackages = watch(`lines.${index}.received_packages`) || 0
  const grossAmount = Number(watch(`lines.${index}.gross_amount`)) || 0
  const discounts = Number(watch(`lines.${index}.discounts`)) || 0
  const allocatedExpenses = Number(watch(`lines.${index}.allocated_expenses`)) || 0
  const nonRecoverableTaxes = Number(watch(`lines.${index}.non_recoverable_taxes`)) || 0

  const { productId, variantId, products, variants, presentations, onProductChange, onVariantChange, onPresentationChange, offeringsForPresentation } =
    useReceiptLineFields({ index, supplierId, setValue })

  const offerings = presentationId ? offeringsForPresentation(presentationId) : []

  const lineErrors = errors.lines?.[index]
  const fieldError = (field: keyof ReceiptFormValues['lines'][number]) =>
    lineErrors?.[field]?.message as string | undefined || validationErrors[`lines.${index}.${field}`]

  const totals = computeReceiptLineTotals({
    receivedPackages,
    presentationFactor,
    grossAmount,
    discounts,
    allocatedExpenses,
    nonRecoverableTaxes,
  })

  return (
    <div className="space-y-4 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Línea {index + 1}</p>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Quitar línea ${index + 1}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      {isNew ? (
        <>
          <FormField label="Producto" required>
            <Select aria-label={`Producto línea ${index + 1}`} value={productId} onChange={(event) => onProductChange(event.target.value)}>
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Variante" required>
            <Select
              aria-label={`Variante línea ${index + 1}`}
              value={variantId}
              disabled={!productId}
              onChange={(event) => onVariantChange(event.target.value)}
            >
              <option value="">Selecciona una variante</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>{variant.name} ({variant.code})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Presentación de compra" required error={fieldError('variant_purchase_presentation_id')}>
            <Select
              aria-label={`Presentación de compra línea ${index + 1}`}
              value={presentationId}
              disabled={!variantId}
              error={Boolean(fieldError('variant_purchase_presentation_id'))}
              onChange={(event) => onPresentationChange(event.target.value)}
            >
              <option value="">Selecciona una presentación</option>
              {presentations.map((presentation) => (
                <option key={presentation.id} value={presentation.id}>
                  {presentation.template?.name ?? 'Sin plantilla'}
                  {presentation.template ? ` (x${presentation.template.base_unit_quantity})` : ''}
                </option>
              ))}
            </Select>
          </FormField>
        </>
      ) : (
        <FormField label="Producto / Variante / Presentación">
          <p className="rounded-md border bg-muted px-3 py-2 text-sm">{label ?? 'No disponible'}</p>
        </FormField>
      )}

      <FormField label="Oferta del proveedor" error={fieldError('supplier_offering_id')}>
        <Select
          aria-label={`Oferta del proveedor línea ${index + 1}`}
          disabled={!presentationId}
          error={Boolean(fieldError('supplier_offering_id'))}
          {...register(`lines.${index}.supplier_offering_id`)}
        >
          <option value="">Sin oferta específica</option>
          {offerings.map((offering) => (
            <option key={offering.id} value={offering.id}>
              {offering.supplier_code ?? offering.id} · {formatCurrency(offering.quoted_price)}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Paquetes pagados" error={fieldError('ordered_packages')}>
          <Input
            aria-label={`Paquetes pagados línea ${index + 1}`}
            type="number"
            step="0.0001"
            error={Boolean(fieldError('ordered_packages'))}
            {...register(`lines.${index}.ordered_packages`, { valueAsNumber: true })}
          />
        </FormField>
        <FormField label="Paquetes recibidos" required error={fieldError('received_packages')}>
          <Input
            aria-label={`Paquetes recibidos línea ${index + 1}`}
            type="number"
            step="0.0001"
            error={Boolean(fieldError('received_packages'))}
            {...register(`lines.${index}.received_packages`, { valueAsNumber: true })}
          />
        </FormField>
        <FormField label="Paquetes de bonificación" error={fieldError('bonus_packages')}>
          <Input
            aria-label={`Paquetes de bonificación línea ${index + 1}`}
            type="number"
            step="0.0001"
            error={Boolean(fieldError('bonus_packages'))}
            {...register(`lines.${index}.bonus_packages`, { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Monto bruto" error={fieldError('gross_amount')}>
          <Input
            aria-label={`Monto bruto línea ${index + 1}`}
            type="text"
            inputMode="decimal"
            placeholder="p. ej. 4800.0000"
            error={Boolean(fieldError('gross_amount'))}
            {...register(`lines.${index}.gross_amount`)}
          />
        </FormField>
        <FormField label="Descuentos" error={fieldError('discounts')}>
          <Input
            aria-label={`Descuentos línea ${index + 1}`}
            type="text"
            inputMode="decimal"
            placeholder="0.0000"
            error={Boolean(fieldError('discounts'))}
            {...register(`lines.${index}.discounts`)}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Gastos asignados" error={fieldError('allocated_expenses')}>
          <Input
            aria-label={`Gastos asignados línea ${index + 1}`}
            type="text"
            inputMode="decimal"
            placeholder="0.0000"
            error={Boolean(fieldError('allocated_expenses'))}
            {...register(`lines.${index}.allocated_expenses`)}
          />
        </FormField>
        <FormField label="Impuestos no recuperables" error={fieldError('non_recoverable_taxes')}>
          <Input
            aria-label={`Impuestos no recuperables línea ${index + 1}`}
            type="text"
            inputMode="decimal"
            placeholder="0.0000"
            error={Boolean(fieldError('non_recoverable_taxes'))}
            {...register(`lines.${index}.non_recoverable_taxes`)}
          />
        </FormField>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <p>Unidades base recibidas: <strong>{totals.baseUnitsReceived.toLocaleString('es-MX')}</strong></p>
        <p>Monto neto de adquisición: <strong>{formatCurrency(totals.netAcquisitionAmount)}</strong></p>
        <p>Costo unitario efectivo: <strong>{formatCurrency(totals.effectiveUnitCost)}</strong></p>
      </div>
    </div>
  )
}
