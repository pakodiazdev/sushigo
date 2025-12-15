import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useCreateCashRegister, useUpdateCashRegister } from '@/services/cash-hooks'
import { CashRegisterType, type CashRegister, type CashRegisterFormData } from '@/types/cash'
import { Loader2 } from 'lucide-react'

interface CashRegisterFormProps {
  register?: CashRegister | null
  branches: Array<{ id: number; name: string }>
  operatingUnits: Array<{ id: number; name: string; branch_id: number }>
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CashRegisterForm({
  register,
  branches,
  operatingUnits,
  isOpen,
  onClose,
  onSuccess,
}: CashRegisterFormProps) {
  const isEditing = !!register
  
  const [formData, setFormData] = useState<CashRegisterFormData>({
    code: register?.code || '',
    name: register?.name || '',
    branch_id: register?.branch_id || 0,
    operating_unit_id: register?.operating_unit_id || null,
    type: register?.type || CashRegisterType.ON_PREMISE,
    is_active: register?.is_active ?? true,
    meta: register?.meta || undefined,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (register) {
      setFormData({
        code: register.code,
        name: register.name,
        branch_id: register.branch_id,
        operating_unit_id: register.operating_unit_id,
        type: register.type,
        is_active: register.is_active,
        meta: register.meta || undefined,
      })
    }
  }, [register])

  const createMutation = useCreateCashRegister()
  const updateMutation = useUpdateCashRegister()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.code.trim()) {
      newErrors.code = 'El código es requerido'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }
    if (!formData.branch_id) {
      newErrors.branch_id = 'La sucursal es requerida'
    }
    if (formData.type === CashRegisterType.EVENT && !formData.operating_unit_id) {
      newErrors.operating_unit_id = 'La unidad operativa es requerida para cajas de eventos'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: register.id,
          data: formData,
        })
      } else {
        await createMutation.mutateAsync(formData)
      }
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  const handleChange = (field: keyof CashRegisterFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Filter operating units by selected branch
  const filteredOperatingUnits = operatingUnits.filter(
    ou => ou.branch_id === formData.branch_id
  )

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Caja Registradora' : 'Nueva Caja Registradora'}
      description={isEditing ? 'Actualiza los datos de la caja registradora' : 'Crea una nueva caja registradora'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="Código"
          error={errors.code}
          required
        >
          <input
            type="text"
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="REG-001"
            disabled={isEditing} // Code can't be changed once created
          />
        </FormField>

        <FormField
          label="Nombre"
          error={errors.name}
          required
        >
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Caja Principal"
          />
        </FormField>

        <FormField
          label="Sucursal"
          error={errors.branch_id}
          required
        >
          <Select
            value={formData.branch_id || ''}
            onChange={(e) => handleChange('branch_id', parseInt(e.target.value))}
          >
            <option value="">Selecciona una sucursal</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Tipo de Caja"
          error={errors.type}
          required
        >
          <Select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value as CashRegisterType)}
          >
            <option value={CashRegisterType.ON_PREMISE}>Local</option>
            <option value={CashRegisterType.DELIVERY}>Delivery</option>
            <option value={CashRegisterType.EVENT}>Evento</option>
          </Select>
        </FormField>

        {formData.type === CashRegisterType.EVENT && (
          <FormField
            label="Unidad Operativa"
            error={errors.operating_unit_id}
            required
            hint="Requerido para cajas de eventos"
          >
            <Select
              value={formData.operating_unit_id || ''}
              onChange={(e) => handleChange('operating_unit_id', e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Selecciona una unidad operativa</option>
              {filteredOperatingUnits.map(ou => (
                <option key={ou.id} value={ou.id}>
                  {ou.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="Estado">
          <Checkbox
            checked={formData.is_active}
            onChange={(e) => handleChange('is_active', e.target.checked)}
            label="Activa"
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </SlidePanel>
  )
}
