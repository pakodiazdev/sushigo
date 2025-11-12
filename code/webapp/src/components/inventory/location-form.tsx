import { useState, FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useToast } from '@/components/ui/toast-provider'
import { inventoryLocationApi } from '@/services/inventory-api'
import type { InventoryLocation } from '@/types/inventory'
import axios from 'axios'

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
      const response = await axios.get('http://localhost:8000/api/v1/operating-units')
      return response.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => inventoryLocationApi.create(data),
    onSuccess: () => {
      showSuccess(
        'Location created successfully',
        'Location Created'
      )
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Failed to create location',
        'Error'
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      inventoryLocationApi.update(location!.id, data),
    onSuccess: () => {
      showSuccess(
        'Location updated successfully',
        'Location Updated'
      )
      onSuccess()
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Failed to update location',
        'Error'
      )
    },
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.operating_unit_id) {
      newErrors.operating_unit_id = 'Operating unit is required'
    }
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters'
    }
    if (!formData.type) {
      newErrors.type = 'Location type is required'
    }
    if (formData.priority < 0 || formData.priority > 1000) {
      newErrors.priority = 'Priority must be between 0 and 1000'
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
          label="Operating Unit"
          required
          error={errors.operating_unit_id}
        >
          <Select
            value={formData.operating_unit_id}
            onChange={(e) => setFormData({ ...formData, operating_unit_id: Number(e.target.value) })}
            error={!!errors.operating_unit_id}
          >
            <option value="0">Select operating unit</option>
            {operatingUnits?.map((unit: any) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.type})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Location Name"
          required
          error={errors.name}
        >
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Main Warehouse"
            error={!!errors.name}
          />
        </FormField>

        <FormField
          label="Location Type"
          required
          error={errors.type}
        >
          <Select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            error={!!errors.type}
          >
            <option value="">Select type</option>
            <option value="MAIN">Main Storage</option>
            <option value="TEMP">Temporary</option>
            <option value="KITCHEN">Kitchen</option>
            <option value="BAR">Bar</option>
            <option value="RETURN">Return</option>
            <option value="WASTE">Waste</option>
          </Select>
        </FormField>

        <FormField
          label="Priority"
          required
          error={errors.priority}
          hint="Higher values indicate higher priority (0-1000)"
        >
          <Input
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
            placeholder="100"
            error={!!errors.priority}
          />
        </FormField>

        <FormField label="Notes">
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Additional notes or description"
          />
        </FormField>

        <div className="space-y-3">
          <Checkbox
            checked={formData.is_primary}
            onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
            label="Primary location for this operating unit"
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
            {location ? 'Update' : 'Create'} Location
          </Button>
        </div>

        {mutation.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'An error occurred while saving the location'}
            </p>
          </div>
        )}
      </SlidePanel.Footer>
    </form>
  )
}

