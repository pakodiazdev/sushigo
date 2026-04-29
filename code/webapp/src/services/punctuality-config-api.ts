import { apiClient } from '@/lib/api-client'
import type {
  AssignBonusConfigPayload,
  CreateBonusGroupPayload,
  EmployeeBonusConfig,
  PunctualityBonusGroup,
  PunctualityRange,
  UpdatePunctualityRangesPayload,
} from '@/types/punctuality'

export const punctualityConfigApi = {
  listRanges: () =>
    apiClient.get<{ status: number; data: PunctualityRange[] }>('/punctuality/ranges'),

  /** Full replacement — server computes max_seconds and sort_order from the sorted list. */
  updateRanges: (payload: UpdatePunctualityRangesPayload) =>
    apiClient.put<{ status: number; data: PunctualityRange[] }>('/punctuality/ranges', payload),

  listBonusGroups: () =>
    apiClient.get<{ status: number; data: PunctualityBonusGroup[] }>('/punctuality/bonus-groups'),

  createBonusGroup: (payload: CreateBonusGroupPayload) =>
    apiClient.post<{ status: number; data: PunctualityBonusGroup }>('/punctuality/bonus-groups', payload),

  getBonusConfig: (employeeId: string) =>
    apiClient.get<{ status: number; data: EmployeeBonusConfig[] }>(`/employees/${employeeId}/bonus-config`),

  assignBonusConfig: (employeeId: string, payload: AssignBonusConfigPayload) =>
    apiClient.post<{ status: number; data: EmployeeBonusConfig }>(`/employees/${employeeId}/bonus-config`, payload),
}
