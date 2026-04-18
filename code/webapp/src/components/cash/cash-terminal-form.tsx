import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useCreateCashTerminal, useUpdateCashTerminal } from '@/services/cash-hooks'
import type { CashTerminal } from '@/types/cash'

const cashTerminalSchema = z.object({
    branch_id: z.number().min(1, 'Este campo es requerido'),
    name: z.string().min(1, 'Este campo es requerido'),
    provider: z.string().min(1, 'Este campo es requerido'),
    account_ref: z.string().min(1, 'Este campo es requerido'),
    last_four: z.string().regex(/^\d{4}$/, 'Debe ser exactamente 4 dígitos'),
    is_active: z.boolean(),
    meta: z.record(z.string(), z.unknown()).optional(),
})

type CashTerminalFormValues = z.infer<typeof cashTerminalSchema>

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

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CashTerminalFormValues>({
        resolver: zodResolver(cashTerminalSchema),
        defaultValues: {
            branch_id: terminal?.branch_id || 0,
            name: terminal?.name || '',
            provider: terminal?.provider || '',
            account_ref: terminal?.account_ref || '',
            last_four: terminal?.last_four || '',
            is_active: terminal?.is_active ?? true,
            meta: terminal?.meta || undefined,
        },
    })

    const createMutation = useCreateCashTerminal()
    const updateMutation = useUpdateCashTerminal()

    // Watch values for controlled inputs
    const branchId = watch('branch_id')
    const provider = watch('provider')
    const lastFour = watch('last_four')
    const isActive = watch('is_active')

    const onSubmit = async (formData: CashTerminalFormValues) => {
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    label="Sucursal"
                    error={errors.branch_id?.message}
                    required
                >
                    <Select
                        value={branchId || ''}
                        onChange={(e) => setValue('branch_id', Number.parseInt(e.target.value))}
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
                    error={errors.name?.message}
                    required
                    hint="Nombre descriptivo de la terminal (ej. Terminal Principal, TPV Caja 1)"
                >
                    <input
                        type="text"
                        {...register('name')}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                        placeholder="Terminal Principal"
                    />
                </FormField>

                <FormField
                    label="Proveedor"
                    error={errors.provider?.message}
                    required
                >
                    <Select
                        value={provider}
                        onChange={(e) => setValue('provider', e.target.value)}
                    >
                        <option value="">Selecciona un proveedor</option>
                        {PROVIDERS.map(providerItem => (
                            <option key={providerItem.value} value={providerItem.value}>
                                {providerItem.label}
                            </option>
                        ))}
                    </Select>
                </FormField>

                <FormField
                    label="Referencia de Cuenta"
                    error={errors.account_ref?.message}
                    required
                    hint="Número de afiliación o ID de la terminal"
                >
                    <input
                        type="text"
                        {...register('account_ref')}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                        placeholder="12345678"
                    />
                </FormField>

                <FormField
                    label="Últimos 4 Dígitos"
                    error={errors.last_four?.message}
                    required
                    hint="Últimos 4 dígitos de la terminal para identificación"
                >
                    <input
                        type="text"
                        value={lastFour}
                        onChange={(e) => setValue('last_four', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md font-mono"
                        placeholder="1234"
                        maxLength={4}
                    />
                </FormField>

                <FormField label="Estado">
                    <Checkbox
                        checked={isActive}
                        onChange={(e) => setValue('is_active', e.target.checked)}
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
