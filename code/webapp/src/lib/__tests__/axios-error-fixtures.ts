import { AxiosError, AxiosHeaders } from 'axios'

/**
 * Shared 403/404 AxiosError fixtures for tests asserting on isForbiddenError()/
 * isNotFoundError() classification — extracted to stop the identical inline
 * builder from being duplicated across every list/detail test file (SonarCloud
 * new-code duplication finding on PR #625).
 */
export function forbiddenError() {
  const error = new AxiosError('Forbidden')
  error.response = { status: 403, statusText: 'Forbidden', data: {}, headers: {}, config: { headers: new AxiosHeaders() } }
  return error
}

export function notFoundError() {
  const error = new AxiosError('Not Found')
  error.response = { status: 404, statusText: 'Not Found', data: {}, headers: {}, config: { headers: new AxiosHeaders() } }
  return error
}
