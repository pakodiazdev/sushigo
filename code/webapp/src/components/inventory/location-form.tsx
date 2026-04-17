import { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useFormState, validators } from '@/hooks/use-form-state'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { useOperatingUnitsSelect } from '@/hooks/use-inventory-queries'
import { inventoryLocationApi } from '@/services/inventory-api'
import type { InventoryLocation } from '@/types/inventory'
import type { OperatingUnit } from '@/types/auth'

interface LocationFormProps {
  location?: InventoryLocation | null
  onSuccess: () => void
  onCancel: () => void
}

type LocationType = 'MAIN' | 'KITCHEN' | 'BAR' | 'TEMP' | 'RETURN'

interface LocationFormData {
  operating_unit_id: number
  name: string
  type: LocationType
  priority: number
  is_primary: boolean
  is_active: boolean
  notes: string
}

export function LocationForm({ location, onSuccess, onCancel }: LocationFormProps) {
  const isEditing = !!location

  // Use shared query hook for operating units
  const { data: operatingUnits } = useOperatingUnitsSelect()

  const { formData, setField, errors, validate } = useFormState<LocationFormData>({
    initialData: {
      operating_unit_id: location?.operating_unit_id || 0,
      name: location?.name || '',
      type: (location?.type || 'MAIN') as LocationType,
      priority: location?.priority || 100,
      is_primary: location?.is_primary || false,
      is_active: location?.is_active ?? true,
      notes: location?.notes || '',
    },
    validationRules: {
      operating_unit_id: { required: true },
      name: {
        required: true,
        validate: validators.minLength(3, 'El nombre debe tener al menos 3 caracteres'),
      },
      type: { required: true },
      priority: {
        validate: validators.range(0, 1000, 'La prioridad debe estar entre 0 y 1000'),
      },
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: LocationFormData) => inventoryLocationApi.create(data),
    updateFn: (data: LocationFormData) => inventoryLocationApi.update(location!.id, data),
    entityName: 'Ubicación',
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

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField
          label="Unidad Operativa"
          required
          error={allErrors.operating_unit_id}
        >
          <Select
            value={formData.operating_unit_id}
            onChange={(e) => setField('operating_unit_id', Number(e.target.value))}
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
            value={formData.name}
            onChange={(e) => setField('name', e.target.value)}
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
            value={formData.type}
            onChange={(e) => setField('type', e.target.value as LocationType)}
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
            value={formData.priority}
            onChange={(e) => setField('priority', Number(e.target.value))}
            placeholder="100"
            error={!!allErrors.priority}
          />
        </FormField>

        <FormField label="Notas">
          <Textarea
            value={formData.notes}
            onChange={(e) => setField('notes', e.target.value)}
            rows={3}
            placeholder="Notas adicionales o descripción"
          />
        </FormField>

        <div className="space-y-3">
          <Checkbox
            checked={formData.is_primary}
            onChange={(e) => setField('is_primary', e.target.checked)}
            label="Ubicación principal para esta unidad operativa"
          />
          <Checkbox
            checked={formData.is_active}
            onChange={(e) => setField('is_active', e.target.checked)}
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
