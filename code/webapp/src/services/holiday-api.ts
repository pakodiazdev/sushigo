import { apiClient } from '@/lib/api-client'
import type {
  CreateHolidayPayload,
  Holiday,
  UpdateHolidayPayload,
} from '@/types/attendance-payroll'

interface HolidayListResponse {
  data: Holiday[]
  status: number
  meta: null
}

export const holidayApi = {
  list: async (year?: number): Promise<Holiday[]> => {
    const params = year ? { year } : undefined
    const res = await apiClient.get<HolidayListResponse>('/holidays', { params })
    return res.data.data
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
