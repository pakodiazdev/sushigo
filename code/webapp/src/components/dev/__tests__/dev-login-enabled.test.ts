// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDevLoginEnabled } from '../dev-login-enabled'

describe('isDevLoginEnabled', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('returns false when VITE_LOGIN_WITH_DEVDEBUG is not "true" (empty string)', () => {
        vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', '')
        vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'dev,testing')
        vi.stubEnv('VITE_APP_ENV', 'dev')

        expect(isDevLoginEnabled()).toBe(false)
    })

    it('returns false when VITE_LOGIN_WITH_DEVDEBUG is "false"', () => {
        vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'false')
        vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'dev,testing')
        vi.stubEnv('VITE_APP_ENV', 'dev')

        expect(isDevLoginEnabled()).toBe(false)
    })

    it('returns false when VITE_APP_ENV is not in the allowed list', () => {
        vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'true')
        vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'dev,devtest')
        vi.stubEnv('VITE_APP_ENV', 'production')

        expect(isDevLoginEnabled()).toBe(false)
    })

    it('returns true when flag is "true" and env is in the allowed list', () => {
        vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'true')
        vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'dev,devtest,testing')
        vi.stubEnv('VITE_APP_ENV', 'dev')

        expect(isDevLoginEnabled()).toBe(true)
    })

    it('trims whitespace in allowed environments', () => {
        vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'true')
        vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', ' dev , devtest ')
        vi.stubEnv('VITE_APP_ENV', 'dev')

        expect(isDevLoginEnabled()).toBe(true)
    })

    it('returns false when allowed list is empty', () => {
        vi.stubEnv('VITE_LOGIN_WITH_DEVDEBUG', 'true')
        vi.stubEnv('VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS', '')
        vi.stubEnv('VITE_APP_ENV', 'dev')

        expect(isDevLoginEnabled()).toBe(false)
    })
})

