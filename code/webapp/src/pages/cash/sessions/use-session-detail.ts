import { useCashSession, useCashSessionSummary } from '@/services/cash-hooks'
import { getApiErrorMessage } from '@/lib/api-error'

export function useCashSessionDetailPage(sessionId: string) {
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useCashSession(sessionId)
  const { data: summary, isLoading: isLoadingSummary, error: summaryError } = useCashSessionSummary(sessionId)

  const error = sessionError ?? summaryError

  return {
    session: session ?? null,
    summary: summary ?? null,
    isLoading: isLoadingSession || isLoadingSummary,
    errorMessage: error ? getApiErrorMessage(error, 'No se pudo cargar el detalle de la sesión.') : null,
  }
}
