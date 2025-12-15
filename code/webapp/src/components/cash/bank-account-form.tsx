import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useCreateBankAccount, useUpdateBankAccount } from '@/services/cash-hooks'
import type { BankAccount, BankAccountFormData } from '@/types/cash'
import { Loader2 } from 'lucide-react'

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
  
  const [formData, setFormData] = useState<BankAccountFormData>({
    branch_id: account?.branch_id || 0,
    alias: account?.alias || '',
    bank_name: account?.bank_name || '',
    account_number_masked: account?.account_number_masked || '',
    clabe_masked: account?.clabe_masked || '',
    is_active: account?.is_active ?? true,
    meta: account?.meta || undefined,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (account) {
      setFormData({
        branch_id: account.branch_id,
        alias: account.alias,
        bank_name: account.bank_name,
        account_number_masked: account.account_number_masked,
        clabe_masked: account.clabe_masked,
        is_active: account.is_active,
        meta: account.meta || undefined,
      })
    }
  }, [account])

  const createMutation = useCreateBankAccount()
  const updateMutation = useUpdateBankAccount()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.branch_id) {
      newErrors.branch_id = 'La sucursal es requerida'
    }
    if (!formData.alias.trim()) {
      newErrors.alias = 'El alias es requerido'
    }
    if (!formData.bank_name) {
      newErrors.bank_name = 'El banco es requerido'
    }
    if (!formData.account_number_masked.trim()) {
      newErrors.account_number_masked = 'Los últimos 4 dígitos de la cuenta son requeridos'
    } else if (!/^\d{4}$/.test(formData.account_number_masked)) {
      newErrors.account_number_masked = 'Debe ser exactamente 4 dígitos'
    }
    if (formData.clabe_masked && !/^\d{3}-\d{4}$/.test(formData.clabe_masked)) {
      newErrors.clabe_masked = 'Formato debe ser XXX-XXXX (3 dígitos, guión, 4 dígitos)'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      if (isEditing) {
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

  const handleChange = (field: keyof BankAccountFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleClabeChange = (value: string) => {
    // Auto-format CLABE with dash: XXX-XXXX
    const cleaned = value.replace(/\D/g, '')
    let formatted = cleaned
    
    if (cleaned.length > 3) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`
    }
    
    handleChange('clabe_masked', formatted)
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
      description={isEditing ? 'Actualiza los datos de la cuenta' : 'Crea una nueva cuenta bancaria'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
          label="Alias"
          error={errors.alias}
          required
          hint="Nombre descriptivo de la cuenta (ej. Cuenta Principal, Cuenta Eventos)"
        >
          <input
            type="text"
            value={formData.alias}
            onChange={(e) => handleChange('alias', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Cuenta Principal"
          />
        </FormField>

        <FormField
          label="Banco"
          error={errors.bank_name}
          required
        >
          <Select
            value={formData.bank_name}
            onChange={(e) => handleChange('bank_name', e.target.value)}
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
          error={errors.account_number_masked}
          required
          hint="Por seguridad, solo almacenamos los últimos 4 dígitos"
        >
          <input
            type="text"
            value={formData.account_number_masked}
            onChange={(e) => handleChange('account_number_masked', e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full px-3 py-2 border rounded-md font-mono"
            placeholder="1234"
            maxLength={4}
          />
        </FormField>

        <FormField
          label="CLABE Enmascarada (Opcional)"
          error={errors.clabe_masked}
          hint="Formato: XXX-XXXX (primeros 3 + últimos 4 dígitos)"
        >
          <input
            type="text"
            value={formData.clabe_masked}
            onChange={(e) => handleClabeChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md font-mono"
            placeholder="012-3456"
            maxLength={8}
          />
        </FormField>

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
