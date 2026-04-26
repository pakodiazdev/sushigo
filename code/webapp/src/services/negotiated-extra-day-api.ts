import { apiClient } from '@/lib/api-client'
import type {
  ListExtraDaysFilters,
  NegotiatedExtraDay,
  PaginatedNegotiatedExtraDays,
  RegisterExtraDayPayload,
} from '@/types/negotiated-extra-day'

export const negotiatedExtraDayApi = {
  register: async (payload: RegisterExtraDayPayload): Promise<NegotiatedExtraDay> => {
    const res = await apiClient.post<{ data: NegotiatedExtraDay }>('/negotiated-extra-days', payload)
    return res.data.data
  },

  list: async (employeeId: string, filters?: ListExtraDaysFilters): Promise<PaginatedNegotiatedExtraDays> => {
    const res = await apiClient.get<PaginatedNegotiatedExtraDays>(
      `/employees/${employeeId}/negotiated-extra-days`,
      { params: filters },
    )
    return res.data
  },
}
