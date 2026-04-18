import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { useOperatingUnitsSelect } from '@/hooks/use-inventory-queries'
import { inventoryLocationApi } from '@/services/inventory-api'
import type { InventoryLocation } from '@/types/inventory'
import type { OperatingUnit } from '@/types/auth'

const locationSchema = z.object({
  operating_unit_id: z.number().min(1, 'Este campo es requerido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  type: z.enum(['MAIN', 'KITCHEN', 'BAR', 'TEMP', 'RETURN']),
  priority: z.number().min(0).max(1000, 'La prioridad debe estar entre 0 y 1000'),
  is_primary: z.boolean(),
  is_active: z.boolean(),
  notes: z.string(),
})

type LocationFormValues = z.infer<typeof locationSchema>

interface LocationFormProps {
  location?: InventoryLocation | null
  onSuccess: () => void
  onCancel: () => void
}

export function LocationForm({ location, onSuccess, onCancel }: LocationFormProps) {
  const isEditing = !!location

  // Use shared query hook for operating units
  const { data: operatingUnits } = useOperatingUnitsSelect()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      operating_unit_id: location?.operating_unit_id || 0,
      name: location?.name || '',
      type: (location?.type || 'MAIN') as LocationFormValues['type'],
      priority: location?.priority || 100,
      is_primary: location?.is_primary || false,
      is_active: location?.is_active ?? true,
      notes: location?.notes || '',
    },
  })

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (data: LocationFormValues) =>
      isEditing && location
        ? inventoryLocationApi.update(location.id, data)
        : inventoryLocationApi.create(data),
    successMessage: isEditing ? 'Ubicación actualizada exitosamente' : 'Ubicación creada exitosamente',
    successTitle: isEditing ? 'Ubicación Actualizada' : 'Ubicación Creada',
    errorMessageFallback: isEditing ? 'Error al actualizar la ubicación' : 'Error al crear la ubicación',
    onSuccess: () => onSuccess(),
  })

  // Merge client and server validation errors
  const allErrors = {
    operating_unit_id: errors.operating_unit_id?.message || validationErrors.operating_unit_id,
    name: errors.name?.message || validationErrors.name,
    type: errors.type?.message || validationErrors.type,
    priority: errors.priority?.message || validationErrors.priority,
  }

  const onSubmit = async (data: LocationFormValues) => {
    await execute(data)
  }

  // Watch values for controlled inputs
  const operatingUnitId = watch('operating_unit_id')
  const locationType = watch('type')
  const isPrimary = watch('is_primary')
  const isActive = watch('is_active')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField
          label="Unidad Operativa"
          required
          error={allErrors.operating_unit_id}
        >
          <Select
            value={operatingUnitId}
            onChange={(e) => setValue('operating_unit_id', Number(e.target.value))}
            error={!!allErrors.operating_unit_id}
          >
            <option value="0">Seleccione una unidad operativa</option>
            {operatingUnits?.map((unit: OperatingUnit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.type})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Nombre de la Ubicación"
          required
          error={allErrors.name}
        >
          <Input
            {...register('name')}
            placeholder="ej., Almacén Principal"
            error={!!allErrors.name}
          />
        </FormField>

        <FormField
          label="Tipo de Ubicación"
          required
          error={allErrors.type}
        >
          <Select
            value={locationType}
            onChange={(e) => setValue('type', e.target.value as LocationFormValues['type'])}
            error={!!allErrors.type}
          >
            <option value="">Seleccione un tipo</option>
            <option value="MAIN">Almacén Principal</option>
            <option value="KITCHEN">Cocina</option>
            <option value="BAR">Bar</option>
            <option value="TEMP">Temporal</option>
            <option value="RETURN">Devoluciones</option>
          </Select>
        </FormField>

        <FormField
          label="Prioridad"
          required
          error={allErrors.priority}
          hint="Valores más altos indican mayor prioridad (0-1000)"
        >
          <Input
            type="number"
            {...register('priority', { valueAsNumber: true })}
            placeholder="100"
            error={!!allErrors.priority}
          />
        </FormField>

        <FormField label="Notas">
          <Textarea
            {...register('notes')}
            rows={3}
            placeholder="Notas adicionales o descripción"
          />
        </FormField>

        <div className="space-y-3">
          <Checkbox
            checked={isPrimary}
            onChange={(e) => setValue('is_primary', e.target.checked)}
            label="Ubicación principal para esta unidad operativa"
          />
          <Checkbox
            checked={isActive}
            onChange={(e) => setValue('is_active', e.target.checked)}
            label="Activa"
          />
        </div>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} Ubicación
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
