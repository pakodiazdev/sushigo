/**
 * Evaluates whether the dev-debug login feature is enabled on the frontend.
 *
 * Both conditions must be true:
 *   1. VITE_LOGIN_WITH_DEVDEBUG must be exactly 'true'
 *   2. VITE_APP_ENV must be in the VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS csv list
 *
 * This mirrors the backend DevLoginGuard validation and prevents unnecessary
 * API calls when the feature is disabled.
 */
export function isDevLoginEnabled(): boolean {
    if (import.meta.env.VITE_LOGIN_WITH_DEVDEBUG !== 'true') {
        return false
    }

    const allowedEnvs = (import.meta.env.VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS ?? '')
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean)

    const currentEnv = import.meta.env.VITE_APP_ENV ?? ''

    return allowedEnvs.includes(currentEnv)
}
