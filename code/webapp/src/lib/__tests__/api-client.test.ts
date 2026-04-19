/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('api-client', () => {
  // We need to reset modules to test the interceptors properly
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('request interceptor', () => {
    it('adds Authorization header when auth token exists', async () => {
      const mockAuthStorage = JSON.stringify({
        state: { token: 'test-jwt-token' },
      })
      vi.mocked(localStorage.getItem).mockReturnValue(mockAuthStorage)

      const { apiClient } = await import('../api-client')

      // Create a request config and run through interceptors
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        } as Record<string, string>,
      }

      const interceptor = apiClient.interceptors.request.handlers[0]
      const result = interceptor.fulfilled(config)

      expect(result.headers.Authorization).toBe('Bearer test-jwt-token')
    })

    it('does not add Authorization header when no auth storage', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const { apiClient } = await import('../api-client')

      const config = {
        headers: {
          'Content-Type': 'application/json',
        } as Record<string, string>,
      }

      const interceptor = apiClient.interceptors.request.handlers[0]
      const result = interceptor.fulfilled(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('does not add Authorization header when token is missing in state', async () => {
      const mockAuthStorage = JSON.stringify({
        state: { user: 'test-user', token: null },
      })
      vi.mocked(localStorage.getItem).mockReturnValue(mockAuthStorage)

      const { apiClient } = await import('../api-client')

      const config = {
        headers: {} as Record<string, string>,
      }

      const interceptor = apiClient.interceptors.request.handlers[0]
      const result = interceptor.fulfilled(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('handles invalid JSON in localStorage gracefully', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid-json')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { apiClient } = await import('../api-client')

      const config = {
        headers: {} as Record<string, string>,
      }

      const interceptor = apiClient.interceptors.request.handlers[0]
      const result = interceptor.fulfilled(config)

      expect(result.headers.Authorization).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalledWith(
        '[API Client] Error parsing auth storage:',
        expect.any(Error),
      )
      consoleSpy.mockRestore()
    })

    it('rejects request errors', async () => {
      const { apiClient } = await import('../api-client')

      const interceptor = apiClient.interceptors.request.handlers[0]
      const error = new Error('Request error')

      await expect(interceptor.rejected(error)).rejects.toThrow('Request error')
    })
  })

  describe('response interceptor', () => {
    it('passes through successful responses', async () => {
      const { apiClient } = await import('../api-client')

      const response = { data: 'test-data', status: 200 }
      const interceptor = apiClient.interceptors.response.handlers[0]
      const result = interceptor.fulfilled(response)

      expect(result).toEqual(response)
    })

    it('clears auth and redirects on 401 error', async () => {
      vi.mocked(localStorage.removeItem).mockImplementation(() => {})

      // Mock window.location
      const originalLocation = window.location
      delete (window as { location?: Location }).location
      window.location = { href: '' } as Location

      const { apiClient } = await import('../api-client')

      const error = {
        response: { status: 401 },
      }
      const interceptor = apiClient.interceptors.response.handlers[0]

      await expect(interceptor.rejected(error)).rejects.toEqual(error)

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth-storage')
      expect(window.location.href).toBe('/login')

      // Restore
      window.location = originalLocation
    })

    it('does not redirect for non-401 errors', async () => {
      const { apiClient } = await import('../api-client')

      const error = {
        response: { status: 500 },
      }
      const interceptor = apiClient.interceptors.response.handlers[0]

      await expect(interceptor.rejected(error)).rejects.toEqual(error)
      expect(localStorage.removeItem).not.toHaveBeenCalled()
    })

    it('handles error without response', async () => {
      const { apiClient } = await import('../api-client')

      const error = new Error('Network error')
      const interceptor = apiClient.interceptors.response.handlers[0]

      await expect(interceptor.rejected(error)).rejects.toThrow('Network error')
      expect(localStorage.removeItem).not.toHaveBeenCalled()
    })
  })

  describe('configuration', () => {
    it('creates axios instance with correct baseURL', async () => {
      const { apiClient } = await import('../api-client')

      // Check that it has a baseURL (defaults to localhost in test)
      expect(apiClient.defaults.baseURL).toBeDefined()
    })

    it('has correct default headers', async () => {
      const { apiClient } = await import('../api-client')

      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
      expect(apiClient.defaults.headers['Accept']).toBe('application/json')
    })
  })
})
