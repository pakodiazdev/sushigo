import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Card } from '@/components/ui/card'
import { PlusCircle, Trash2 } from 'lucide-react'
import {
  useCreateCashAdjustment,
  useCashSessions,
  useCashTerminals,
  useBankAccounts
} from '@/services/cash-hooks'
import {
  AdjustmentType,
  Direction,
  TenderType,
  CashAdjustmentLineFormData,
  SessionStatus
} from '@/types/cash'

interface CreateAdjustmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  cashSessionId?: number
}

export function CreateAdjustmentDialog({
  isOpen,
  onClose,
  onSuccess,
  cashSessionId: preselectedSessionId,
}: CreateAdjustmentDialogProps) {
  // Form state
  const [cashSessionId, setCashSessionId] = useState<string>(preselectedSessionId?.toString() || '')
  const [type, setType] = useState<AdjustmentType>(AdjustmentType.EXTERNAL_IMPORT)
  const [direction, setDirection] = useState<Direction>(Direction.INFLOW)
  const [sourceSystem, setSourceSystem] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [lines, setLines] = useState<CashAdjustmentLineFormData[]>([
    { tender_type: TenderType.CASH, amount: '', currency: 'MXN' }
  ])

  // Queries
  const { data: sessionsData, isLoading: loadingSessions } = useCashSessions(
    isOpen ? { status: SessionStatus.DRAFT } : undefined
  )
  const { data: terminalsData } = useCashTerminals(isOpen ? { is_active: true } : undefined)
  const { data: accountsData } = useBankAccounts(isOpen ? { is_active: true } : undefined)

  // Mutation
  const createAdjustment = useCreateCashAdjustment()

  // Set preselected session when dialog opens
  useEffect(() => {
    if (isOpen && preselectedSessionId) {
      setCashSessionId(preselectedSessionId.toString())
    }
  }, [isOpen, preselectedSessionId])

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCashSessionId(preselectedSessionId?.toString() || '')
      setType(AdjustmentType.EXTERNAL_IMPORT)
      setDirection(Direction.INFLOW)
      setSourceSystem('')
      setNotes('')
      setLines([{ tender_type: TenderType.CASH, amount: '', currency: 'MXN' }])
    }
  }, [isOpen, preselectedSessionId])

  const handleAddLine = () => {
    setLines([...lines, { tender_type: TenderType.CASH, amount: '', currency: 'MXN' }])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const handleLineChange = <K extends keyof CashAdjustmentLineFormData>(index: number, field: K, value: CashAdjustmentLineFormData[K]) => {
    const updatedLines = [...lines]
    updatedLines[index] = { ...updatedLines[index], [field]: value } as CashAdjustmentLineFormData

    // Clear terminal/bank account when tender type changes
    if (field === 'tender_type') {
      if (updatedLines[index]) {
        updatedLines[index].card_terminal_id = null
        updatedLines[index].bank_account_id = null
      }
    }

    setLines(updatedLines)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cashSessionId) {
      return
    }

    // Validate lines
    for (const line of lines) {
      if (!line.amount || parseFloat(line.amount) <= 0) {
        return
      }
      if (line.tender_type === TenderType.CARD && !line.card_terminal_id) {
        return
      }
      if (line.tender_type === TenderType.TRANSFER && !line.bank_account_id) {
        return
      }
    }

    try {
      await createAdjustment.mutateAsync({
        cash_session_id: parseInt(cashSessionId),
        type,
        direction,
        source_system: sourceSystem || undefined,
        notes: notes || undefined,
        lines,
      })

      onSuccess?.()
      onClose()
    } catch (_error) {
      // Error is handled by the hook
    }
  }

  const calculateTotal = () => {
    return lines.reduce((sum, line) => {
      const amount = parseFloat(line.amount || '0')
      return sum + amount
    }, 0)
  }

  const sessions = sessionsData?.data || []
  const terminals = terminalsData?.data || []
  const accounts = accountsData?.data || []

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="Registrar Ajuste de Caja" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Session Selection */}
        {!preselectedSessionId && (
          <FormField label="Sesión de Caja" required>
            <Select
              value={cashSessionId}
              onChange={(e) => setCashSessionId(e.target.value)}
              disabled={loadingSessions}
            >
              <option value="">Selecciona una sesión abierta...</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id.toString()}>
                  {session.cash_register?.name} - {session.operating_date}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {/* Type and Direction */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tipo de Ajuste" required>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as AdjustmentType)}
            >
              <option value={AdjustmentType.EXTERNAL_IMPORT}>Importación Externa</option>
              <option value={AdjustmentType.CORRECTION}>Corrección Manual</option>
            </Select>
          </FormField>

          <FormField label="Dirección" required>
            <Select
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
            >
              <option value={Direction.INFLOW}>Entrada</option>
              <option value={Direction.OUTFLOW}>Salida</option>
            </Select>
          </FormField>
        </div>

        {/* Source System (for EXTERNAL_IMPORT) */}
        {type === AdjustmentType.EXTERNAL_IMPORT && (
          <FormField label="Sistema de Origen">
            <Input
              value={sourceSystem}
              onChange={(e) => setSourceSystem(e.target.value)}
              placeholder="Ej: POS, UBER_EATS, RAPPI"
            />
          </FormField>
        )}

        {/* Notes / Justification */}
        <FormField
          label={type === AdjustmentType.CORRECTION ? 'Justificación' : 'Notas'}
          required={type === AdjustmentType.CORRECTION}
        >
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              type === AdjustmentType.CORRECTION
                ? 'Explica el motivo de este ajuste...'
                : 'Comentarios adicionales...'
            }
            rows={3}
            required={type === AdjustmentType.CORRECTION}
          />
        </FormField>

        {/* Lines Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Desglose por Tipo de Pago *</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Agregar Línea
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Línea {index + 1}</span>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLine(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Tender Type */}
                    <FormField label="Tipo de Pago">
                      <Select
                        value={line.tender_type}
                        onChange={(e) =>
                          handleLineChange(index, 'tender_type', e.target.value as TenderType)
                        }
                      >
                        <option value={TenderType.CASH}>💵 Efectivo</option>
                        <option value={TenderType.CARD}>💳 Tarjeta</option>
                        <option value={TenderType.TRANSFER}>🏦 Transferencia</option>
                      </Select>
                    </FormField>

                    {/* Amount */}
                    <FormField label="Monto (MXN)">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={line.amount}
                        onChange={(e) => handleLineChange(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </FormField>
                  </div>

                  {/* Card Terminal (if CARD) */}
                  {line.tender_type === TenderType.CARD && (
                    <FormField label="Terminal de Pago" required>
                      <Select
                        value={line.card_terminal_id?.toString() || ''}
                        onChange={(e) =>
                          handleLineChange(index, 'card_terminal_id', parseInt(e.target.value))
                        }
                      >
                        <option value="">Selecciona una terminal...</option>
                        {terminals.map((terminal) => (
                          <option key={terminal.id} value={terminal.id.toString()}>
                            {terminal.name} ({terminal.provider})
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}

                  {/* Bank Account (if TRANSFER) */}
                  {line.tender_type === TenderType.TRANSFER && (
                    <FormField label="Cuenta Bancaria" required>
                      <Select
                        value={line.bank_account_id?.toString() || ''}
                        onChange={(e) =>
                          handleLineChange(index, 'bank_account_id', parseInt(e.target.value))
                        }
                      >
                        <option value="">Selecciona una cuenta...</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id.toString()}>
                            {account.alias} - {account.bank_name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}

                  {/* Reference */}
                  <FormField label="Referencia">
                    <Input
                      value={line.reference || ''}
                      onChange={(e) => handleLineChange(index, 'reference', e.target.value)}
                      placeholder="Número de referencia o transacción..."
                    />
                  </FormField>
                </div>
              </Card>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-green-600">
                ${calculateTotal().toFixed(2)} MXN
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createAdjustment.isPending || !cashSessionId}
          >
            {createAdjustment.isPending ? 'Registrando...' : 'Registrar Ajuste'}
          </Button>
        </div>
      </form>
    </SlidePanel>
  )
}
