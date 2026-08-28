import { apiClient } from '@/lib/api-client'
import type {
  CashRegister,
  CashTerminal,
  BankAccount,
  CashSession,
  CashAdjustment,
  CashExpense,
  SessionSummary,
  PaginatedResponse,
  EntityResponse,
  MessageResponse,
  CashRegisterFormData,
  CashTerminalFormData,
  BankAccountFormData,
  CashSessionFormData,
  CashAdjustmentFormData,
  CashExpenseFormData,
  CashRegisterFilters,
  CashTerminalFilters,
  BankAccountFilters,
  CashSessionFilters,
  CashAdjustmentFilters,
  CashExpenseFilters,
} from '@/types/cash'

const api = apiClient

// ============================================================================
// Cash Registers
// ============================================================================

export const cashRegisterApi = {
  list: (params?: CashRegisterFilters) =>
    api.get<PaginatedResponse<CashRegister>>('/cash-registers', { params }),

  nextCode: () =>
    api.get<{ code: string; prefix: string }>('/cash-registers/next-code'),

  get: (id: string) =>
    api.get<EntityResponse<CashRegister>>(`/cash-registers/${id}`),

  create: (data: CashRegisterFormData) =>
    api.post<EntityResponse<CashRegister>>('/cash-registers', data),

  update: (id: string, data: Partial<CashRegisterFormData>) =>
    api.put<EntityResponse<CashRegister>>(`/cash-registers/${id}`, data),

  delete: (id: string) =>
    api.delete<MessageResponse>(`/cash-registers/${id}`),
}

// ============================================================================
// Cash Terminals
// ============================================================================

export const cashTerminalApi = {
  list: (params?: CashTerminalFilters) =>
    api.get<PaginatedResponse<CashTerminal>>('/cash-terminals', { params }),

  get: (id: string) =>
    api.get<EntityResponse<CashTerminal>>(`/cash-terminals/${id}`),

  create: (data: CashTerminalFormData) =>
    api.post<EntityResponse<CashTerminal>>('/cash-terminals', data),

  update: (id: string, data: Partial<CashTerminalFormData>) =>
    api.put<EntityResponse<CashTerminal>>(`/cash-terminals/${id}`, data),

  delete: (id: string) =>
    api.delete<MessageResponse>(`/cash-terminals/${id}`),
}

// ============================================================================
// Bank Accounts
// ============================================================================

export const bankAccountApi = {
  list: (params?: BankAccountFilters) =>
    api.get<PaginatedResponse<BankAccount>>('/bank-accounts', { params }),

  get: (id: string) =>
    api.get<EntityResponse<BankAccount>>(`/bank-accounts/${id}`),

  create: (data: BankAccountFormData) =>
    api.post<EntityResponse<BankAccount>>('/bank-accounts', data),

  update: (id: string, data: Partial<BankAccountFormData>) =>
    api.put<EntityResponse<BankAccount>>(`/bank-accounts/${id}`, data),

  delete: (id: string) =>
    api.delete<MessageResponse>(`/bank-accounts/${id}`),
}

// ============================================================================
// Cash Sessions
// ============================================================================

export const cashSessionApi = {
  list: (params?: CashSessionFilters) =>
    api.get<PaginatedResponse<CashSession>>('/cash-sessions', { params }),

  get: (id: string) =>
    api.get<EntityResponse<CashSession>>(`/cash-sessions/${id}`),

  create: (data: CashSessionFormData) =>
    api.post<EntityResponse<CashSession>>('/cash-sessions', data),

  update: (id: string, data: Partial<CashSessionFormData>) =>
    api.put<EntityResponse<CashSession>>(`/cash-sessions/${id}`, data),

  post: (id: string) =>
    api.post<EntityResponse<CashSession>>(`/cash-sessions/${id}/post`),

  getSummary: (id: string) =>
    api.get<EntityResponse<SessionSummary>>(`/cash-sessions/${id}/summary`),
}

// ============================================================================
// Cash Adjustments
// ============================================================================

export const cashAdjustmentApi = {
  list: (params?: CashAdjustmentFilters) =>
    api.get<PaginatedResponse<CashAdjustment>>('/cash-adjustments', { params }),

  get: (id: string) =>
    api.get<EntityResponse<CashAdjustment>>(`/cash-adjustments/${id}`),

  create: (data: CashAdjustmentFormData) =>
    api.post<EntityResponse<CashAdjustment>>('/cash-adjustments', data),

  post: (id: string) =>
    api.post<EntityResponse<CashAdjustment>>(`/cash-adjustments/${id}/post`),

  delete: (id: string) =>
    api.delete<MessageResponse>(`/cash-adjustments/${id}`),
}

// ============================================================================
// Cash Expenses
// ============================================================================

export const cashExpenseApi = {
  list: (params?: CashExpenseFilters) =>
    api.get<PaginatedResponse<CashExpense>>('/cash-expenses', { params }),

  get: (id: string) =>
    api.get<EntityResponse<CashExpense>>(`/cash-expenses/${id}`),

  create: (data: CashExpenseFormData) =>
    api.post<EntityResponse<CashExpense>>('/cash-expenses', data),

  update: (id: string, data: Partial<CashExpenseFormData>) =>
    api.put<EntityResponse<CashExpense>>(`/cash-expenses/${id}`, data),

  post: (id: string) =>
    api.post<EntityResponse<CashExpense>>(`/cash-expenses/${id}/post`),

  delete: (id: string) =>
    api.delete<MessageResponse>(`/cash-expenses/${id}`),
}
