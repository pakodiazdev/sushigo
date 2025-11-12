import { useState, FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useToast } from '@/components/ui/toast-provider'
import { inventoryLocationApi } from '@/services/inventory-api'
import { apiClient } from '@/lib/api-client'
import type { InventoryLocation } from '@/types/inventory'

interface LocationFormProps {
  location?: InventoryLocation | null
  onSuccess: () => void
  onCancel: () => void
}

export function LocationForm({ location, onSuccess, onCancel }: LocationFormProps) {
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    operating_unit_id: location?.operating_unit_id || 0,
    name: location?.name || '',
    type: location?.type || 'MAIN' as const,
    priority: location?.priority || 100,
    is_primary: location?.is_primary || false,
    is_active: location?.is_active ?? true,
    notes: location?.notes || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch operating units for the select
  const { data: operatingUnits } = useQuery({
    queryKey: ['operating-units'],
    queryFn: async () => {
      const response = await apiClient.get('/operating-units')
      return response.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => inventoryLocationApi.create(data),
    onSuccess: () => {
      showSuccess(
        'Ubicación creada exitosamente',
        'Ubicación Creada'
      )
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Error al crear la ubicación',
        'Error'
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      inventoryLocationApi.update(location!.id, data),
    onSuccess: () => {
      showSuccess(
        'Ubicación actualizada exitosamente',
        'Ubicación Actualizada'
      )
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Error al actualizar la ubicación',
        'Error'
      )
    },
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.operating_unit_id) {
      newErrors.operating_unit_id = 'La unidad operativa es requerida'
    }
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres'
    }
    if (!formData.type) {
      newErrors.type = 'El tipo de ubicación es requerido'
    }
    if (formData.priority < 0 || formData.priority > 1000) {
      newErrors.priority = 'La prioridad debe estar entre 0 y 1000'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      if (location) {
        await updateMutation.mutateAsync(formData)
      } else {
        await createMutation.mutateAsync(formData)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const mutation = location ? updateMutation : createMutation
  const isSubmitting = mutation.isPending

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField
          label="Unidad Operativa"
          required
          error={errors.operating_unit_id}
        >
          <Select
            value={formData.operating_unit_id}
            onChange={(e) => setFormData({ ...formData, operating_unit_id: Number(e.target.value) })}
            error={!!errors.operating_unit_id}
          >
            <option value="0">Seleccione una unidad operativa</option>
            {operatingUnits?.map((unit: any) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.type})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Nombre de la Ubicación"
          required
          error={errors.name}
        >
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ej., Almacén Principal"
            error={!!errors.name}
          />
        </FormField>

        <FormField
          label="Tipo de Ubicación"
          required
          error={errors.type}
        >
          <Select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            error={!!errors.type}
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
          error={errors.priority}
          hint="Valores más altos indican mayor prioridad (0-1000)"
        >
          <Input
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
            placeholder="100"
            error={!!errors.priority}
          />
        </FormField>

        <FormField label="Notas">
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Notas adicionales o descripción"
          />
        </FormField>

        <div className="space-y-3">
          <Checkbox
            checked={formData.is_primary}
            onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
            label="Ubicación principal para esta unidad operativa"
          />
          <Checkbox
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
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
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {location ? 'Actualizar' : 'Crear'} Ubicación
          </Button>
        </div>

        {mutation.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Ocurrió un error al guardar la ubicación'}
            </p>
          </div>
        )}
      </SlidePanel.Footer>
    </form>
  )
}

