import { useQuery } from '@tanstack/react-query'
import { appInfoApi, appInfoQueryKeys } from '../api/app-info-api'

/**
 * Whether this deployment is the public, resettable Demo (#635). Runtime, not
 * build-time: the Demo and QA share the same `preview` image, so only the API
 * knows which environment it is. Any failure is treated as "not the Demo" —
 * the banner is informational and must never block the app.
 */
export function useDemoMode() {
  const { data } = useQuery({
    queryKey: appInfoQueryKeys.all,
    queryFn: async () => (await appInfoApi.get()).data.data,
    staleTime: Infinity,
    retry: false,
  })

  return {
    isDemo: data?.is_demo ?? false,
    dataResets: data?.data_resets ?? false,
    demoEmail: data?.demo_account?.email ?? null,
  }
}
