// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useCashRegisters,
  useCashRegister,
  useCreateCashRegister,
  useUpdateCashRegister,
  useDeleteCashRegister,
  useCashTerminals,
  useCashTerminal,
  useCreateCashTerminal,
  useUpdateCashTerminal,
  useDeleteCashTerminal,
  useBankAccounts,
  useBankAccount,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  useCashSessions,
  useCashSession,
  useCashSessionSummary,
  useCreateCashSession,
  useUpdateCashSession,
  usePostCashSession,
  useCashAdjustments,
  useCashAdjustment,
  useCreateCashAdjustment,
  usePostCashAdjustment,
  useDeleteCashAdjustment,
  useCashExpenses,
  useCashExpense,
  useCreateCashExpense,
  useUpdateCashExpense,
  usePostCashExpense,
  useDeleteCashExpense,
} from '@/services/cash-hooks'
import { CashRegisterType, AdjustmentType, TenderType, Direction } from '@/types/cash'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/cash-api', () => ({
  cashRegisterApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  cashTerminalApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  bankAccountApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  cashSessionApi: {
    list: vi.fn(),
    get: vi.fn(),
    getSummary: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    post: vi.fn(),
  },
  cashAdjustmentApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  cashExpenseApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import {
  cashRegisterApi,
  cashTerminalApi,
  bankAccountApi,
  cashSessionApi,
  cashAdjustmentApi,
  cashExpenseApi,
} from '@/services/cash-api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const mockListResponse = { data: { data: [], meta: {} } }
const mockEntityResponse = { data: { data: { id: 1 } } }

// ── useCashRegisters ───────────────────────────────────────────────────────────

describe('useCashRegisters', () => {
  beforeEach(() => {
    vi.mocked(cashRegisterApi.list).mockResolvedValue(mockListResponse as never)
  })
  afterEach(() => { vi.clearAllMocks() })

  it('returns query result', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashRegisters(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cashRegisterApi.list).toHaveBeenCalled()
  })

  it('passes filters to the api', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useCashRegisters({ branch_id: 1, is_active: true }), { wrapper })
    await waitFor(() => expect(cashRegisterApi.list).toHaveBeenCalledWith({ branch_id: 1, is_active: true }))
  })
})

describe('useCashRegister', () => {
  beforeEach(() => {
    vi.mocked(cashRegisterApi.get).mockResolvedValue(mockEntityResponse as never)
  })
  afterEach(() => { vi.clearAllMocks() })

  it('fetches a single register by id', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashRegister(5), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cashRegisterApi.get).toHaveBeenCalledWith(5)
  })

  it('is disabled when id is 0', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashRegister(0), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

// ── useCreateCashRegister ──────────────────────────────────────────────────────

describe('useCreateCashRegister', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('calls showSuccess on successful creation', async () => {
    vi.mocked(cashRegisterApi.create).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashRegister(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ name: 'Caja 1', code: 'C1', type: CashRegisterType.ON_PREMISE, branch_id: 1, is_active: true })
    })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('creada'), expect.any(String))
  })

  it('calls showError on failure', async () => {
    vi.mocked(cashRegisterApi.create).mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashRegister(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ name: 'Caja 1', code: 'C1', type: CashRegisterType.ON_PREMISE, branch_id: 1, is_active: true }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useUpdateCashRegister', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('calls showSuccess on successful update', async () => {
    vi.mocked(cashRegisterApi.update).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateCashRegister(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: { name: 'Caja Updated' } })
    })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('calls showError on failure', async () => {
    vi.mocked(cashRegisterApi.update).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateCashRegister(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ id: 1, data: { name: 'x' } }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useDeleteCashRegister', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('calls showSuccess on successful delete', async () => {
    vi.mocked(cashRegisterApi.delete).mockResolvedValueOnce(undefined as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCashRegister(), { wrapper })
    await act(async () => { await result.current.mutateAsync(1) })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('eliminada'), expect.any(String))
  })

  it('calls showError on failure', async () => {
    vi.mocked(cashRegisterApi.delete).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCashRegister(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync(1) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

// ── useCashTerminals ───────────────────────────────────────────────────────────

describe('useCashTerminals', () => {
  beforeEach(() => { vi.mocked(cashTerminalApi.list).mockResolvedValue(mockListResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('calls cashTerminalApi.list', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashTerminals(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useCashTerminal', () => {
  beforeEach(() => { vi.mocked(cashTerminalApi.get).mockResolvedValue(mockEntityResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('fetches a single terminal by id', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashTerminal(3), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cashTerminalApi.get).toHaveBeenCalledWith(3)
  })

  it('is disabled for id=0', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashTerminal(0), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateCashTerminal', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on create', async () => {
    vi.mocked(cashTerminalApi.create).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashTerminal(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ name: 'Terminal 1', provider: 'Clip', account_ref: 'acc-1', last_four: '1234', branch_id: 1, is_active: true }) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashTerminalApi.create).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashTerminal(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ name: 'T1', provider: 'Clip', account_ref: 'acc-1', last_four: '1234', branch_id: 1, is_active: true }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useUpdateCashTerminal', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on update', async () => {
    vi.mocked(cashTerminalApi.update).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateCashTerminal(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: 1, data: { name: 'T' } }) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashTerminalApi.update).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateCashTerminal(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ id: 1, data: {} }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useDeleteCashTerminal', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on delete', async () => {
    vi.mocked(cashTerminalApi.delete).mockResolvedValueOnce(undefined as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCashTerminal(), { wrapper })
    await act(async () => { await result.current.mutateAsync(2) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashTerminalApi.delete).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCashTerminal(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync(2) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

// ── useBankAccounts ────────────────────────────────────────────────────────────

describe('useBankAccounts', () => {
  beforeEach(() => { vi.mocked(bankAccountApi.list).mockResolvedValue(mockListResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('calls bankAccountApi.list', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useBankAccounts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useBankAccount', () => {
  beforeEach(() => { vi.mocked(bankAccountApi.get).mockResolvedValue(mockEntityResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('fetches by id', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useBankAccount(7), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('is disabled for id=0', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useBankAccount(0), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateBankAccount', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast', async () => {
    vi.mocked(bankAccountApi.create).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateBankAccount(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ alias: 'BBVA Principal', bank_name: 'BBVA', account_number_masked: '****1234', clabe_masked: '****1234', branch_id: 1, is_active: true }) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(bankAccountApi.create).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateBankAccount(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ alias: 'BBVA Principal', bank_name: 'BBVA', account_number_masked: '****1234', clabe_masked: '****1234', branch_id: 1, is_active: true }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useUpdateBankAccount', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on update', async () => {
    vi.mocked(bankAccountApi.update).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateBankAccount(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: 1, data: { alias: 'Updated' } }) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(bankAccountApi.update).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateBankAccount(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ id: 1, data: {} }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useDeleteBankAccount', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on delete', async () => {
    vi.mocked(bankAccountApi.delete).mockResolvedValueOnce(undefined as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteBankAccount(), { wrapper })
    await act(async () => { await result.current.mutateAsync(1) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(bankAccountApi.delete).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteBankAccount(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync(1) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

// ── useCashSessions ────────────────────────────────────────────────────────────

describe('useCashSessions', () => {
  beforeEach(() => { vi.mocked(cashSessionApi.list).mockResolvedValue(mockListResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('calls cashSessionApi.list', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashSessions(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useCashSession', () => {
  beforeEach(() => { vi.mocked(cashSessionApi.get).mockResolvedValue(mockEntityResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('fetches a single session', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashSession(10), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('is disabled for id=0', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashSession(0), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCashSessionSummary', () => {
  beforeEach(() => { vi.mocked(cashSessionApi.getSummary).mockResolvedValue(mockEntityResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('fetches session summary', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashSessionSummary(10), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cashSessionApi.getSummary).toHaveBeenCalledWith(10)
  })

  it('is disabled for id=0', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashSessionSummary(0), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateCashSession', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on create', async () => {
    vi.mocked(cashSessionApi.create).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashSession(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ cash_register_id: 1, operating_date: '2026-03-31', opening_balance: '1000' })
    })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('abierta'), expect.any(String))
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashSessionApi.create).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashSession(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ cash_register_id: 1, operating_date: '2026-03-31', opening_balance: '1000' }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useUpdateCashSession', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on update', async () => {
    vi.mocked(cashSessionApi.update).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateCashSession(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: 1, data: { opening_balance: '500' } }) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashSessionApi.update).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateCashSession(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ id: 1, data: {} }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('usePostCashSession', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on post (close session)', async () => {
    vi.mocked(cashSessionApi.post).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePostCashSession(), { wrapper })
    await act(async () => { await result.current.mutateAsync(5) })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('cerrada'), expect.any(String))
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashSessionApi.post).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePostCashSession(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync(5) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

// ── useCashAdjustments ─────────────────────────────────────────────────────────

describe('useCashAdjustments', () => {
  beforeEach(() => { vi.mocked(cashAdjustmentApi.list).mockResolvedValue(mockListResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('calls cashAdjustmentApi.list', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashAdjustments(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useCashAdjustment', () => {
  beforeEach(() => { vi.mocked(cashAdjustmentApi.get).mockResolvedValue(mockEntityResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('fetches single adjustment', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashAdjustment(3), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('is disabled for id=0', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashAdjustment(0), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateCashAdjustment', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on create', async () => {
    const mockResponse = { data: { data: { id: 1, cash_session_id: 10 } } }
    vi.mocked(cashAdjustmentApi.create).mockResolvedValueOnce(mockResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashAdjustment(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ cash_session_id: 10, type: AdjustmentType.CORRECTION, direction: Direction.INFLOW, lines: [] })
    })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows success toast when cash_session_id is null', async () => {
    const mockResponse = { data: { data: { id: 1, cash_session_id: null } } }
    vi.mocked(cashAdjustmentApi.create).mockResolvedValueOnce(mockResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashAdjustment(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ cash_session_id: 0, type: AdjustmentType.CORRECTION, direction: Direction.INFLOW, lines: [] })
    })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashAdjustmentApi.create).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashAdjustment(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ cash_session_id: 1, type: AdjustmentType.CORRECTION, direction: Direction.INFLOW, lines: [] }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('usePostCashAdjustment', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on post', async () => {
    vi.mocked(cashAdjustmentApi.post).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePostCashAdjustment(), { wrapper })
    await act(async () => { await result.current.mutateAsync(2) })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('confirmado'), expect.any(String))
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashAdjustmentApi.post).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePostCashAdjustment(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync(2) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useDeleteCashAdjustment', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on delete', async () => {
    vi.mocked(cashAdjustmentApi.delete).mockResolvedValueOnce(undefined as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCashAdjustment(), { wrapper })
    await act(async () => { await result.current.mutateAsync(3) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashAdjustmentApi.delete).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCashAdjustment(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync(3) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

// ── useCashExpenses ────────────────────────────────────────────────────────────

describe('useCashExpenses', () => {
  beforeEach(() => { vi.mocked(cashExpenseApi.list).mockResolvedValue(mockListResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('calls cashExpenseApi.list', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashExpenses(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useCashExpense', () => {
  beforeEach(() => { vi.mocked(cashExpenseApi.get).mockResolvedValue(mockEntityResponse as never) })
  afterEach(() => { vi.clearAllMocks() })

  it('fetches single expense', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashExpense(4), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('is disabled for id=0', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCashExpense(0), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateCashExpense', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on create', async () => {
    vi.mocked(cashExpenseApi.create).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashExpense(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ cash_session_id: 1, tender_type: TenderType.CASH, amount: '50', category: 'Supplies', vendor: 'Vendor X', incurred_at: '2026-01-01' })
    })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('registrado'), expect.any(String))
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashExpenseApi.create).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateCashExpense(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ cash_session_id: 1, tender_type: TenderType.CASH, amount: '50', category: 'Supplies', vendor: 'Vendor X', incurred_at: '2026-01-01' }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useUpdateCashExpense', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on update', async () => {
    vi.mocked(cashExpenseApi.update).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateCashExpense(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: 1, data: { amount: '60' } }) })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashExpenseApi.update).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateCashExpense(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync({ id: 1, data: {} }) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('usePostCashExpense', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on post (confirm)', async () => {
    vi.mocked(cashExpenseApi.post).mockResolvedValueOnce(mockEntityResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePostCashExpense(), { wrapper })
    await act(async () => { await result.current.mutateAsync(6) })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('confirmado'), expect.any(String))
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashExpenseApi.post).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePostCashExpense(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync(6) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})

describe('useDeleteCashExpense', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('shows success toast on delete', async () => {
    vi.mocked(cashExpenseApi.delete).mockResolvedValueOnce(undefined as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCashExpense(), { wrapper })
    await act(async () => { await result.current.mutateAsync(7) })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('eliminado'), expect.any(String))
  })

  it('shows error toast on failure', async () => {
    vi.mocked(cashExpenseApi.delete).mockRejectedValueOnce(new Error('fail'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCashExpense(), { wrapper })
    await act(async () => {
      try { await result.current.mutateAsync(7) }
      catch { /* expected */ }
    })
    expect(mockShowError).toHaveBeenCalled()
  })
})
