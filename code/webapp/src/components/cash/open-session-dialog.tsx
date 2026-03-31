import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Loader2 } from 'lucide-react'
import { useCreateCashSession, useCashRegisters } from '@/services/cash-hooks'
import { getApiErrorMessage, getApiValidationErrors, hasApiValidationErrors } from '@/lib/api-error'
import { CashRegisterType, type CashSessionFormData } from '@/types/cash'

interface OpenSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (sessionId: number) => void
  branchId?: number
}

export function OpenSessionDialog({
  isOpen,
  onClose,
  onSuccess,
  branchId,
}: OpenSessionDialogProps) {
  const [cashRegisterId, setCashRegisterId] = useState('')
  const [operatingDate, setOperatingDate] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load cash registers - only when dialog is open
  // If no branchId provided, load all active registers
  const { data: registersData, isLoading: loadingRegisters } = useCashRegisters(
    isOpen ? { branch_id: branchId, is_active: true } : undefined
  )

  // Create session mutation
  const createMutation = useCreateCashSession()

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCashRegisterId('')
      setOperatingDate(getTodayDate())
      setOpeningBalance('')
      setErrors({})
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Basic validation
    const newErrors: Record<string, string> = {}

    if (!cashRegisterId) {
      newErrors.cash_register_id = 'Debe seleccionar una caja registradora'
    }
    if (!operatingDate) {
      newErrors.operating_date = 'La fecha de operación es requerida'
    }
    if (openingBalance && parseFloat(openingBalance) < 0) {
      newErrors.opening_balance = 'El fondo inicial no puede ser negativo'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const payload: CashSessionFormData = {
        cash_register_id: parseInt(cashRegisterId),
        operating_date: operatingDate,
      }

      // Only include opening_balance if it has a value
      if (openingBalance && openingBalance.trim() !== '') {
        payload.opening_balance = openingBalance
      }

      const response = await createMutation.mutateAsync(payload)

      if (onSuccess && response.data?.data?.id) {
        onSuccess(response.data.data.id)
      }
      onClose()
    } catch (error: unknown) {
      if (hasApiValidationErrors(error)) {
        setErrors(getApiValidationErrors(error))
      } else {
        const message = getApiErrorMessage(error, 'Error al abrir la sesión')
        setErrors({ general: message })
      }
    }
  }

  // Get register type label for display
  const getRegisterTypeLabel = (type: CashRegisterType): string => {
    const labels: Record<CashRegisterType, string> = {
      [CashRegisterType.ON_PREMISE]: 'Local',
      [CashRegisterType.DELIVERY]: 'Delivery',
      [CashRegisterType.EVENT]: 'Evento',
    }
    return labels[type] || type
  }

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Abrir Sesión de Caja"
      description="Inicie una nueva sesión de caja para el día de operación seleccionado"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General error */}
        {errors.general && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errors.general}
          </div>
        )}

        {/* Cash Register */}
        <FormField
          label="Caja Registradora"
          required
          error={errors.cash_register_id}
        >
          <Select
            id="cash_register_id"
            name="cash_register_id"
            value={cashRegisterId}
            onChange={(e) => setCashRegisterId(e.target.value)}
            disabled={createMutation.isPending || loadingRegisters}
          >
            <option value="">
              {loadingRegisters ? 'Cargando...' : 'Seleccione una caja...'}
            </option>
            {registersData?.data?.map((register) => (
              <option key={register.id} value={register.id}>
                {register.name} ({register.code}) - {getRegisterTypeLabel(register.type)}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Operating Date */}
        <FormField
          label="Fecha de Operación"
          required
          error={errors.operating_date}
          hint="Fecha para la cual se abrirá la sesión"
        >
          <Input
            id="operating_date"
            name="operating_date"
            type="date"
            value={operatingDate}
            onChange={(e) => setOperatingDate(e.target.value)}
            disabled={createMutation.isPending}
          />
        </FormField>

        {/* Opening Balance */}
        <FormField
          label="Fondo Inicial (Opcional)"
          error={errors.opening_balance}
          hint="Monto inicial en efectivo con el que se abre la caja"
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="opening_balance"
              name="opening_balance"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="pl-7"
              disabled={createMutation.isPending}
            />
          </div>
        </FormField>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Abrir Sesión
          </Button>
        </div>
      </form>
    </SlidePanel>
  )
}
