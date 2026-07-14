import { describe, it, expect, vi, beforeEach } from 'vitest'
import { employeeVacationPolicyApi } from '../employee-vacation-policy-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('employeeVacationPolicyApi.updateOverride', () => {
  it('calls PUT /employees/{employeeId}/vacation-policy-override with the payload', async () => {
    const payload = { rule_key: 'ContractualPolicy' as const, tiers: [{ years_from: 1, days: 30 }] }
    const mockResponse = { data: { status: 200, data: { rule_key: 'ContractualPolicy', tiers: [], active_rule_label: 'Política contractual' } } }
    vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

    const result = await employeeVacationPolicyApi.updateOverride('emp-001', payload)

    expect(apiClient.put).toHaveBeenCalledWith('/employees/emp-001/vacation-policy-override', payload)
    expect(result).toEqual(mockResponse)
  })

  it('supports clearing the override with rule_key null', async () => {
    const payload = { rule_key: null }
    const mockResponse = { data: { status: 200, data: { rule_key: null, tiers: [], active_rule_label: 'LFT México 2022' } } }
    vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

    await employeeVacationPolicyApi.updateOverride('emp-001', payload)

    expect(apiClient.put).toHaveBeenCalledWith('/employees/emp-001/vacation-policy-override', payload)
  })
})
