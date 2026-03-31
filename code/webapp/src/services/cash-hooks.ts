import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  cashRegisterApi,
  cashTerminalApi,
  bankAccountApi,
  cashSessionApi,
  cashAdjustmentApi,
  cashExpenseApi,
} from '@/services/cash-api'
import type {
  CashRegisterFilters,
  CashTerminalFilters,
  BankAccountFilters,
  CashSessionFilters,
  CashAdjustmentFilters,
  CashExpenseFilters,
  CashRegisterFormData,
  CashTerminalFormData,
  BankAccountFormData,
  CashSessionFormData,
  CashAdjustmentFormData,
  CashExpenseFormData,
} from '@/types/cash'

// ============================================================================
// Cash Registers Hooks
// ============================================================================

export function useCashRegisters(filters?: CashRegisterFilters) {
  return useQuery({
    queryKey: ['cash-registers', filters],
    queryFn: async () => {
      const response = await cashRegisterApi.list(filters)
      return response.data
    },
  })
}

export function useCashRegister(id: number) {
  return useQuery({
    queryKey: ['cash-registers', id],
    queryFn: async () => {
      const response = await cashRegisterApi.get(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCreateCashRegister() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CashRegisterFormData) => cashRegisterApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] })
      showSuccess('La caja registradora ha sido creada exitosamente.', 'Caja registradora creada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo crear la caja registradora.'), 'Error')
    },
  })
}

export function useUpdateCashRegister() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CashRegisterFormData> }) =>
      cashRegisterApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] })
      queryClient.invalidateQueries({ queryKey: ['cash-registers', variables.id] })
      showSuccess('La caja registradora ha sido actualizada exitosamente.', 'Caja actualizada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la caja registradora.'), 'Error')
    },
  })
}

export function useDeleteCashRegister() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => cashRegisterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] })
      showSuccess('La caja registradora ha sido eliminada exitosamente.', 'Caja eliminada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la caja registradora.'), 'Error')
    },
  })
}

// ============================================================================
// Cash Terminals Hooks
// ============================================================================

export function useCashTerminals(filters?: CashTerminalFilters) {
  return useQuery({
    queryKey: ['cash-terminals', filters],
    queryFn: async () => {
      const response = await cashTerminalApi.list(filters)
      return response.data
    },
  })
}

export function useCashTerminal(id: number) {
  return useQuery({
    queryKey: ['cash-terminals', id],
    queryFn: async () => {
      const response = await cashTerminalApi.get(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCreateCashTerminal() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CashTerminalFormData) => cashTerminalApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-terminals'] })
      showSuccess('La terminal de pago ha sido creada exitosamente.', 'Terminal creada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo crear la terminal.'), 'Error')
    },
  })
}

export function useUpdateCashTerminal() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CashTerminalFormData> }) =>
      cashTerminalApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-terminals'] })
      queryClient.invalidateQueries({ queryKey: ['cash-terminals', variables.id] })
      showSuccess('La terminal de pago ha sido actualizada exitosamente.', 'Terminal actualizada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la terminal.'), 'Error')
    },
  })
}

export function useDeleteCashTerminal() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => cashTerminalApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-terminals'] })
      showSuccess('La terminal de pago ha sido eliminada exitosamente.', 'Terminal eliminada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la terminal.'), 'Error')
    },
  })
}

// ============================================================================
// Bank Accounts Hooks
// ============================================================================

export function useBankAccounts(filters?: BankAccountFilters) {
  return useQuery({
    queryKey: ['bank-accounts', filters],
    queryFn: async () => {
      const response = await bankAccountApi.list(filters)
      return response.data
    },
  })
}

export function useBankAccount(id: number) {
  return useQuery({
    queryKey: ['bank-accounts', id],
    queryFn: async () => {
      const response = await bankAccountApi.get(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: BankAccountFormData) => bankAccountApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      showSuccess('La cuenta bancaria ha sido creada exitosamente.', 'Cuenta bancaria creada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo crear la cuenta bancaria.'), 'Error')
    },
  })
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BankAccountFormData> }) =>
      bankAccountApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', variables.id] })
      showSuccess('La cuenta bancaria ha sido actualizada exitosamente.', 'Cuenta actualizada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la cuenta bancaria.'), 'Error')
    },
  })
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => bankAccountApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      showSuccess('La cuenta bancaria ha sido eliminada exitosamente.', 'Cuenta eliminada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la cuenta bancaria.'), 'Error')
    },
  })
}

// ============================================================================
// Cash Sessions Hooks
// ============================================================================

export function useCashSessions(filters?: CashSessionFilters) {
  return useQuery({
    queryKey: ['cash-sessions', filters],
    queryFn: async () => {
      const response = await cashSessionApi.list(filters)
      return response.data
    },
  })
}

export function useCashSession(id: number) {
  return useQuery({
    queryKey: ['cash-sessions', id],
    queryFn: async () => {
      const response = await cashSessionApi.get(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCashSessionSummary(id: number) {
  return useQuery({
    queryKey: ['cash-sessions', id, 'summary'],
    queryFn: async () => {
      const response = await cashSessionApi.getSummary(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCreateCashSession() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CashSessionFormData) => cashSessionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      showSuccess('La sesión de caja ha sido abierta exitosamente.', 'Sesión abierta')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo abrir la sesión de caja.'), 'Error')
    },
  })
}

export function useUpdateCashSession() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CashSessionFormData> }) =>
      cashSessionApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions', variables.id] })
      showSuccess('La sesión de caja ha sido actualizada exitosamente.', 'Sesión actualizada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la sesión.'), 'Error')
    },
  })
}

export function usePostCashSession() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => cashSessionApi.post(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions', id] })
      showSuccess('La sesión de caja ha sido cerrada exitosamente.', 'Sesión cerrada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo cerrar la sesión.'), 'Error')
    },
  })
}

// ============================================================================
// Cash Adjustments Hooks
// ============================================================================

export function useCashAdjustments(filters?: CashAdjustmentFilters) {
  return useQuery({
    queryKey: ['cash-adjustments', filters],
    queryFn: async () => {
      const response = await cashAdjustmentApi.list(filters)
      return response.data
    },
  })
}

export function useCashAdjustment(id: number) {
  return useQuery({
    queryKey: ['cash-adjustments', id],
    queryFn: async () => {
      const response = await cashAdjustmentApi.get(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCreateCashAdjustment() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CashAdjustmentFormData) => cashAdjustmentApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cash-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })

      // Invalidar el summary de la sesión específica para que se recalcule el saldo
      const sessionId = response.data.data.cash_session_id
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['cash-sessions', sessionId, 'summary'] })
      }

      showSuccess('El ajuste de caja ha sido creado exitosamente.', 'Ajuste creado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo crear el ajuste.'), 'Error')
    },
  })
}

export function usePostCashAdjustment() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => cashAdjustmentApi.post(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cash-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['cash-adjustments', id] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      showSuccess('El ajuste de caja ha sido confirmado exitosamente.', 'Ajuste confirmado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo confirmar el ajuste.'), 'Error')
    },
  })
}

export function useDeleteCashAdjustment() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => cashAdjustmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      // Invalidar todos los summaries ya que no sabemos qué sesión fue afectada
      queryClient.invalidateQueries({
        queryKey: ['cash-sessions'], predicate: (query) =>
          query.queryKey.length === 3 && query.queryKey[2] === 'summary'
      })
      showSuccess('El ajuste de caja ha sido eliminado exitosamente.', 'Ajuste eliminado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo eliminar el ajuste.'), 'Error')
    },
  })
}

// ============================================================================
// Cash Expenses Hooks
// ============================================================================

export function useCashExpenses(filters?: CashExpenseFilters) {
  return useQuery({
    queryKey: ['cash-expenses', filters],
    queryFn: async () => {
      const response = await cashExpenseApi.list(filters)
      return response.data
    },
  })
}

export function useCashExpense(id: number) {
  return useQuery({
    queryKey: ['cash-expenses', id],
    queryFn: async () => {
      const response = await cashExpenseApi.get(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCreateCashExpense() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CashExpenseFormData) => cashExpenseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      showSuccess('El egreso de caja ha sido registrado exitosamente.', 'Egreso registrado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo registrar el egreso.'), 'Error')
    },
  })
}

export function useUpdateCashExpense() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CashExpenseFormData> }) =>
      cashExpenseApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['cash-expenses', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      showSuccess('El egreso de caja ha sido actualizado exitosamente.', 'Egreso actualizado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo actualizar el egreso.'), 'Error')
    },
  })
}

export function usePostCashExpense() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => cashExpenseApi.post(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cash-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['cash-expenses', id] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      showSuccess('El egreso de caja ha sido confirmado exitosamente.', 'Egreso confirmado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo confirmar el egreso.'), 'Error')
    },
  })
}

export function useDeleteCashExpense() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => cashExpenseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
      showSuccess('El egreso de caja ha sido eliminado exitosamente.', 'Egreso eliminado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo eliminar el egreso.'), 'Error')
    },
  })
}
