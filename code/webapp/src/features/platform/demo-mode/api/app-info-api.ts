import { apiClient } from '@/lib/api-client'
import type { AppInfoResponse } from '../types'

export const appInfoQueryKeys = {
  all: ['app-info'] as const,
}

export const appInfoApi = {
  get: () => apiClient.get<AppInfoResponse>('/app-info'),
}
