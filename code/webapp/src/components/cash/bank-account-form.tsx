import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { CashFormFooter } from '@/components/cash/cash-form-footer'
import { useCreateBankAccount, useUpdateBankAccount } from '@/services/cash-hooks'
import type { BankAccount } from '@/types/cash'

const bankAccountSchema = z.object({
    branch_id: z.number().min(1, 'Este campo es requerido'),
    alias: z.string().min(1, 'Este campo es requerido'),
    bank_name: z.string().min(1, 'Este campo es requerido'),
    account_number_masked: z.string().regex(/^\d{4}$/, 'Debe ser exactamente 4 dígitos'),
    clabe_masked: z.string().regex(/^(\d{3}-\d{4})?$/, 'Formato debe ser XXX-XXXX (3 dígitos, guión, 4 dígitos)').or(z.literal('')),
    is_active: z.boolean(),
    meta: z.record(z.string(), z.unknown()).optional(),
})

type BankAccountFormValues = z.infer<typeof bankAccountSchema>

interface BankAccountFormProps {
    account?: BankAccount | null
    branches: Array<{ id: number; name: string }>
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const BANKS = [
    { value: 'BBVA', label: 'BBVA' },
    { value: 'BANAMEX', label: 'Banamex' },
    { value: 'SANTANDER', label: 'Santander' },
    { value: 'BANORTE', label: 'Banorte' },
    { value: 'HSBC', label: 'HSBC' },
    { value: 'SCOTIABANK', label: 'Scotiabank' },
    { value: 'INBURSA', label: 'Inbursa' },
    { value: 'AZTECA', label: 'Banco Azteca' },
    { value: 'OTHER', label: 'Otro' },
]

export function BankAccountForm({
    account,
    branches,
    isOpen,
    onClose,
    onSuccess,
}: BankAccountFormProps) {
    const isEditing = !!account

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<BankAccountFormValues>({
        resolver: zodResolver(bankAccountSchema),
        defaultValues: {
            branch_id: account?.branch_id || 0,
            alias: account?.alias || '',
            bank_name: account?.bank_name || '',
            account_number_masked: account?.account_number_masked || '',
            clabe_masked: account?.clabe_masked || '',
            is_active: account?.is_active ?? true,
            meta: account?.meta || undefined,
        },
    })

    // Sync form values when account prop changes (always-mounted panel)
    useEffect(() => {
        reset({
            branch_id: account?.branch_id || 0,
            alias: account?.alias || '',
            bank_name: account?.bank_name || '',
            account_number_masked: account?.account_number_masked || '',
            clabe_masked: account?.clabe_masked || '',
            is_active: account?.is_active ?? true,
            meta: account?.meta || undefined,
        })
    }, [account, reset])

    const createMutation = useCreateBankAccount()
    const updateMutation = useUpdateBankAccount()

    // Watch values for controlled inputs
    const branchId = watch('branch_id')
    const bankName = watch('bank_name')
    const clabeMasked = watch('clabe_masked')
    const isActive = watch('is_active')

    const onSubmit = async (formData: BankAccountFormValues) => {
        try {
            if (isEditing && account) {
                await updateMutation.mutateAsync({
                    id: account.id,
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

    const handleClabeChange = (value: string) => {
        // Auto-format CLABE with dash: XXX-XXXX
        const cleaned = value.replace(/\D/g, '')
        let formatted = cleaned

        if (cleaned.length > 3) {
            formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`
        }

        setValue('clabe_masked', formatted)
    }

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
            description={isEditing ? 'Actualiza los datos de la cuenta' : 'Crea una nueva cuenta bancaria'}
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
                    label="Alias"
                    error={errors.alias?.message}
                    required
                    hint="Nombre descriptivo de la cuenta (ej. Cuenta Principal, Cuenta Eventos)"
                >
                    <input
                        type="text"
                        {...register('alias')}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                        placeholder="Cuenta Principal"
                    />
                </FormField>

                <FormField
                    label="Banco"
                    error={errors.bank_name?.message}
                    required
                >
                    <Select
                        value={bankName}
                        onChange={(e) => setValue('bank_name', e.target.value)}
                    >
                        <option value="">Selecciona un banco</option>
                        {BANKS.map(bank => (
                            <option key={bank.value} value={bank.value}>
                                {bank.label}
                            </option>
                        ))}
                    </Select>
                </FormField>

                <FormField
                    label="Últimos 4 Dígitos de Cuenta"
                    error={errors.account_number_masked?.message}
                    required
                    hint="Por seguridad, solo almacenamos los últimos 4 dígitos"
                >
                    <input
                        type="text"
                        {...register('account_number_masked', {
                            onChange: (e) => setValue('account_number_masked', e.target.value.replace(/\D/g, '').slice(0, 4)),
                        })}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md font-mono"
                        placeholder="1234"
                        maxLength={4}
                    />
                </FormField>

                <FormField
                    label="CLABE Enmascarada (Opcional)"
                    error={errors.clabe_masked?.message}
                    hint="Formato: XXX-XXXX (primeros 3 + últimos 4 dígitos)"
                >
                    <input
                        type="text"
                        value={clabeMasked}
                        onChange={(e) => handleClabeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md font-mono"
                        placeholder="012-3456"
                        maxLength={8}
                    />
                </FormField>

                <CashFormFooter
                    isActive={isActive}
                    onActiveChange={(checked) => setValue('is_active', checked)}
                    onCancel={onClose}
                    isLoading={isLoading}
                    isEditing={isEditing}
                />
            </form>
        </SlidePanel>
    )
}
