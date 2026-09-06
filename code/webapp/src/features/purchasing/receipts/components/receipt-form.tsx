import { useMemo } from 'react'
import { Info, Loader2, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { Input } from '@/components/ui/input'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useInventoryLocationsSelect } from '@/hooks/use-inventory-queries'
import { supplierApi } from '@/features/purchasing/suppliers/api/supplier-api'
import { useReceiptForm } from '../hooks/use-receipt-form'
import type { Receipt } from '../types'
import { ReceiptLineFields } from './receipt-line-fields'

interface ReceiptFormProps {
  receipt?: Receipt | null
  onSuccess: (receipt: Receipt) => void
  onCancel: () => void
}

export function ReceiptForm({ receipt, onSuccess, onCancel }: Readonly<ReceiptFormProps>) {
  const {
    isEditing,
    register,
    handleSubmit,
    watch,
    setValue,
    errors,
    fields,
    addLine,
    removeLine,
    onSubmit,
    onSupplierChange,
    validationErrors,
    isSubmitting,
    supplierId,
  } = useReceiptForm({ receipt, onSuccess })

  const suppliersQuery = useQuery({
    queryKey: ['receipt-form-suppliers'],
    queryFn: () => supplierApi.list({ is_active: true }),
  })
  // Only active, purchase-receiving Locations (#568/#572) — a draft saved against
  // any other destination is a 422, so it must never be offered here.
  const locationsQuery = useInventoryLocationsSelect(true, true)

  const suppliers = suppliersQuery.data?.data.data ?? []
  const locations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data])

  // Group the receiving Locations by their owning Operating Unit so the operator
  // picks a destination in the right unit at a glance (#572). Keyed by unit *id*
  // (not name) — two accessible units may share a display name, and merging them
  // would let an operator pick a warehouse in the wrong unit.
  const locationGroups = useMemo(() => {
    const groups = new Map<string, { key: string; unitName: string; items: typeof locations }>()
    for (const location of locations) {
      const key = location.operating_unit ? `ou:${location.operating_unit.id}` : 'ou:none'
      const unitName = location.operating_unit?.name ?? 'Sin unidad operativa'
      const group = groups.get(key) ?? { key, unitName, items: [] }
      group.items.push(location)
      groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => a.unitName.localeCompare(b.unitName))
  }, [locations])

  const groupByUnit = locationGroups.length > 1

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-5">
        <div className="flex gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Crear o actualizar un borrador <strong className="font-semibold text-foreground">no modifica el inventario</strong>.
            Al confirmar la recepción se aplica la cantidad recibida y el costo efectivo en el
            almacén receptor seleccionado.
          </p>
        </div>

        <FormField label="Proveedor" required error={errors.supplier_id?.message}>
          <Select
            aria-label="Proveedor"
            error={Boolean(errors.supplier_id)}
            value={supplierId}
            onChange={(event) => onSupplierChange(event.target.value)}
          >
            <option value="">Selecciona un proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.code})</option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Almacén / ubicación receptora"
          required
          error={errors.destination_location_id?.message}
          hint="Solo se listan ubicaciones activas habilitadas para recibir compras."
        >
          <Select
            aria-label="Almacén / ubicación receptora"
            error={Boolean(errors.destination_location_id)}
            {...register('destination_location_id')}
          >
            <option value="">Selecciona una ubicación</option>
            {groupByUnit
              ? locationGroups.map((group) => (
                  <optgroup key={group.key} label={group.unitName}>
                    {group.items.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </optgroup>
                ))
              : locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Referencia" error={errors.reference?.message}>
            <Input aria-label="Referencia" {...register('reference')} error={Boolean(errors.reference)} />
          </FormField>
          <FormField label="Fecha de recepción" required error={errors.receipt_date?.message}>
            <Input
              aria-label="Fecha de recepción"
              type="date"
              error={Boolean(errors.receipt_date)}
              {...register('receipt_date')}
            />
          </FormField>
        </div>

        <FormField label="Notas" error={errors.notes?.message}>
          <Textarea aria-label="Notas" rows={2} {...register('notes')} />
        </FormField>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Líneas de la recepción</p>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1">
              <Plus className="h-4 w-4" />
              Agregar línea
            </Button>
          </div>
          {errors.lines?.message && (
            <p className="text-sm text-destructive">{errors.lines.message}</p>
          )}
          {fields.map((field, index) => (
            <ReceiptLineFields
              key={field.id}
              index={index}
              supplierId={supplierId}
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              validationErrors={validationErrors}
              onRemove={() => removeLine(index)}
              canRemove={fields.length > 1}
            />
          ))}
        </div>
      </SlidePanel.Body>
      <SlidePanel.Footer>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} recepción
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
