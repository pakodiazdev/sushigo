import { apiClient } from '@/lib/api-client'
import type { NegotiatedExtraDay, RegisterExtraDayPayload } from '@/types/negotiated-extra-day'

export const negotiatedExtraDayApi = {
  register: async (payload: RegisterExtraDayPayload): Promise<NegotiatedExtraDay> => {
    const res = await apiClient.post<{ data: NegotiatedExtraDay }>('/negotiated-extra-days', payload)
    return res.data.data
  },
}
