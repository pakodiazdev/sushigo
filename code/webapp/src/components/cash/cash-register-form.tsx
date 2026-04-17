import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useFormState } from '@/hooks/use-form-state'
import { useCreateCashRegister, useUpdateCashRegister } from '@/services/cash-hooks'
import { CashRegisterType, type CashRegister, type CashRegisterFormData, type OperatingUnit } from '@/types/cash'
import { Loader2 } from 'lucide-react'

interface CashRegisterFormProps {
    register?: CashRegister | null
    operatingUnits: OperatingUnit[]
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CashRegisterForm({
    register,
    operatingUnits,
    isOpen,
    onClose,
    onSuccess,
}: CashRegisterFormProps) {
    const isEditing = !!register

    const { formData, setField, errors, validate } = useFormState<CashRegisterFormData>({
        initialData: {
            code: register?.code || '',
            name: register?.name || '',
            branch_id: register?.branch_id || 1,
            operating_unit_id: register?.operating_unit_id || null,
            type: register?.type || CashRegisterType.ON_PREMISE,
            is_active: register?.is_active ?? true,
            meta: register?.meta || undefined,
        },
        validationRules: {
            code: { required: true },
            name: { required: true },
            branch_id: {
                validate: (value) => {
                    if (!value && isEditing) {
                        return 'La sucursal es requerida'
                    }
                },
            },
            operating_unit_id: {
                validate: (value, data) => {
                    if (data?.type === CashRegisterType.EVENT && !value) {
                        return 'La unidad operativa es requerida para cajas de eventos'
                    }
                },
            },
        },
    })

    const createMutation = useCreateCashRegister()
    const updateMutation = useUpdateCashRegister()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        try {
            if (isEditing && register) {
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

    // Filter operating units by selected branch and only EVENT type
    const filteredOperatingUnits = operatingUnits.filter(
        ou => ou.branch_id === formData.branch_id && ou.type === 'EVENT_TEMP'
    )

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Caja Registradora' : 'Nueva Caja Registradora'}
            description={isEditing ? 'Actualiza los datos de la caja registradora' : 'Crea una nueva caja registradora'}
            noPadding
        >
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                        <FormField
                            label="Código"
                            error={errors.code}
                            required
                        >
                            <Input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setField('code', e.target.value)}
                                placeholder="REG-001"
                                disabled={isEditing}
                                error={!!errors.code}
                            />
                        </FormField>

                        <FormField
                            label="Nombre"
                            error={errors.name}
                            required
                        >
                            <Input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setField('name', e.target.value)}
                                placeholder="Caja Principal"
                                error={!!errors.name}
                            />
                        </FormField>

                        <FormField
                            label="Tipo de Caja"
                            error={errors.type}
                            required
                        >
                            <Select
                                id="cash-register-type"
                                name="type"
                                value={formData.type}
                                onChange={(e) => setField('type', e.target.value as CashRegisterType)}
                            >
                                <option value={CashRegisterType.ON_PREMISE}>Local</option>
                                <option value={CashRegisterType.DELIVERY}>Delivery</option>
                                <option value={CashRegisterType.EVENT}>Evento</option>
                            </Select>
                        </FormField>

                        {formData.type === CashRegisterType.EVENT && (
                            <FormField
                                label="Evento"
                                error={errors.operating_unit_id}
                                required
                                hint="Selecciona el evento al que pertenece esta caja"
                            >
                                <Select
                                    id="operating-unit"
                                    name="operating_unit_id"
                                    value={formData.operating_unit_id || ''}
                                    onChange={(e) => setField('operating_unit_id', e.target.value ? parseInt(e.target.value) : null)}
                                >
                                    <option value="">Selecciona un evento</option>
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
                                onChange={(e) => setField('is_active', e.target.checked)}
                                label="Activa"
                            />
                        </FormField>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="border-t bg-muted/50 px-6 py-4">
                    <div className="flex justify-end gap-3">
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
                </div>
            </form>
        </SlidePanel>
    )
}
