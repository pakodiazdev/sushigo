import { Button } from '@/components/ui/button'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useFormState } from '@/hooks/use-form-state'
import { useCreateCashTerminal, useUpdateCashTerminal } from '@/services/cash-hooks'
import type { CashTerminal, CashTerminalFormData } from '@/types/cash'
import { Loader2 } from 'lucide-react'

interface CashTerminalFormProps {
    terminal?: CashTerminal | null
    branches: Array<{ id: number; name: string }>
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const PROVIDERS = [
    { value: 'CLIP', label: 'Clip' },
    { value: 'STRIPE', label: 'Stripe' },
    { value: 'MERCADOPAGO', label: 'Mercado Pago' },
    { value: 'OPENPAY', label: 'OpenPay' },
    { value: 'BBVA', label: 'BBVA' },
    { value: 'BANAMEX', label: 'Banamex' },
    { value: 'SANTANDER', label: 'Santander' },
    { value: 'OTHER', label: 'Otro' },
]

export function CashTerminalForm({
    terminal,
    branches,
    isOpen,
    onClose,
    onSuccess,
}: CashTerminalFormProps) {
    const isEditing = !!terminal

    const { formData, setField, errors, validate } = useFormState<CashTerminalFormData>({
        initialData: {
            branch_id: terminal?.branch_id || 0,
            name: terminal?.name || '',
            provider: terminal?.provider || '',
            account_ref: terminal?.account_ref || '',
            last_four: terminal?.last_four || '',
            is_active: terminal?.is_active ?? true,
            meta: terminal?.meta || undefined,
        },
        validationRules: {
            branch_id: { required: true },
            name: { required: true },
            provider: { required: true },
            account_ref: { required: true },
            last_four: {
                required: true,
                validate: (value) => {
                    if (typeof value === 'string' && !/^\d{4}$/.test(value)) {
                        return 'Debe ser exactamente 4 dígitos'
                    }
                },
            },
        },
    })

    const createMutation = useCreateCashTerminal()
    const updateMutation = useUpdateCashTerminal()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        try {
            if (isEditing && terminal) {
                await updateMutation.mutateAsync({
                    id: terminal.id,
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

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Terminal' : 'Nueva Terminal'}
            description={isEditing ? 'Actualiza los datos de la terminal' : 'Crea una nueva terminal de pago'}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <FormField
                    label="Sucursal"
                    error={errors.branch_id}
                    required
                >
                    <Select
                        value={formData.branch_id || ''}
                        onChange={(e) => setField('branch_id', parseInt(e.target.value))}
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
                    label="Nombre"
                    error={errors.name}
                    required
                    hint="Nombre descriptivo de la terminal (ej. Terminal Principal, TPV Caja 1)"
                >
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setField('name', e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                        placeholder="Terminal Principal"
                    />
                </FormField>

                <FormField
                    label="Proveedor"
                    error={errors.provider}
                    required
                >
                    <Select
                        value={formData.provider}
                        onChange={(e) => setField('provider', e.target.value)}
                    >
                        <option value="">Selecciona un proveedor</option>
                        {PROVIDERS.map(provider => (
                            <option key={provider.value} value={provider.value}>
                                {provider.label}
                            </option>
                        ))}
                    </Select>
                </FormField>

                <FormField
                    label="Referencia de Cuenta"
                    error={errors.account_ref}
                    required
                    hint="Número de afiliación o ID de la terminal"
                >
                    <input
                        type="text"
                        value={formData.account_ref}
                        onChange={(e) => setField('account_ref', e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                        placeholder="12345678"
                    />
                </FormField>

                <FormField
                    label="Últimos 4 Dígitos"
                    error={errors.last_four}
                    required
                    hint="Últimos 4 dígitos de la terminal para identificación"
                >
                    <input
                        type="text"
                        value={formData.last_four}
                        onChange={(e) => setField('last_four', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md font-mono"
                        placeholder="1234"
                        maxLength={4}
                    />
                </FormField>

                <FormField label="Estado">
                    <Checkbox
                        checked={formData.is_active}
                        onChange={(e) => setField('is_active', e.target.checked)}
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
