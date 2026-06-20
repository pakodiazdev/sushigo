import { apiClient } from '@/lib/api-client'
import type {
  CreateHolidayDefinitionPayload,
  CreateHolidayPayload,
  Holiday,
  HolidayDefinition,
  HolidaysListMeta,
  UpdateHolidayDefinitionPayload,
  UpdateHolidayPayload,
} from '@/types/attendance-payroll'

// ── Holiday instances ─────────────────────────────────────────────────────────

interface HolidayListResponse {
  data: Holiday[]
  status: number
  meta: HolidaysListMeta | null
}

export const holidayApi = {
  list: async (year?: number): Promise<{ data: Holiday[]; warnings: string[] }> => {
    const params = year ? { year } : undefined
    const res = await apiClient.get<HolidayListResponse>('/holidays', { params })
    return {
      data: res.data.data,
      warnings: res.data.meta?.warnings ?? [],
    }
  },

  create: async (payload: CreateHolidayPayload): Promise<Holiday> => {
    const res = await apiClient.post<{ data: Holiday }>('/holidays', payload)
    return res.data.data
  },

  update: async (id: number, payload: UpdateHolidayPayload): Promise<Holiday> => {
    const res = await apiClient.put<{ data: Holiday }>(`/holidays/${id}`, payload)
    return res.data.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/holidays/${id}`)
  },
}

// ── Holiday definitions ───────────────────────────────────────────────────────

interface HolidayDefinitionListResponse {
  data: HolidayDefinition[]
}

export const holidayDefinitionApi = {
  list: async (): Promise<HolidayDefinition[]> => {
    const res = await apiClient.get<HolidayDefinitionListResponse>('/holiday-definitions')
    return res.data.data
  },

  create: async (payload: CreateHolidayDefinitionPayload): Promise<HolidayDefinition> => {
    const res = await apiClient.post<{ data: HolidayDefinition }>('/holiday-definitions', payload)
    return res.data.data
  },

  update: async (id: number, payload: UpdateHolidayDefinitionPayload): Promise<HolidayDefinition> => {
    const res = await apiClient.put<{ data: HolidayDefinition }>(`/holiday-definitions/${id}`, payload)
    return res.data.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/holiday-definitions/${id}`)
  },
}
