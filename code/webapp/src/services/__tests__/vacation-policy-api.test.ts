import { describe, it, expect, vi, beforeEach } from 'vitest'
import { vacationPolicyApi } from '../vacation-policy-api'

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

describe('vacationPolicyApi.get', () => {
  it('calls GET /vacation-policy', async () => {
    const mockResponse = { data: { status: 200, data: { active_rule_key: 'VacationsLFTMX', active_rule_label: 'LFT México 2022', tiers: [] } } }
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

    const result = await vacationPolicyApi.get()

    expect(apiClient.get).toHaveBeenCalledWith('/vacation-policy')
    expect(result).toEqual(mockResponse)
  })
})

describe('vacationPolicyApi.update', () => {
  it('calls PUT /vacation-policy with the payload', async () => {
    const payload = { active_rule_key: 'CustomCompanyPolicy' as const, tiers: [{ years_from: 1, days: 18 }] }
    const mockResponse = { data: { status: 200, data: { active_rule_key: 'CustomCompanyPolicy', active_rule_label: 'Política de la empresa', tiers: [] } } }
    vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

    const result = await vacationPolicyApi.update(payload)

    expect(apiClient.put).toHaveBeenCalledWith('/vacation-policy', payload)
    expect(result).toEqual(mockResponse)
  })
})
