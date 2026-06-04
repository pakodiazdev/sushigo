/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    /**
     * Clock format used throughout the UI.
     * '12' = h:mm AM/PM (default)  |  '24' = HH:mm
     * @see doc/conventions/frontend/time-format.md
     */
    readonly VITE_TIME_FORMAT?: '12' | '24'
    /**
     * Controls whether the Dev Debugger starts hidden on boot.
     */
    readonly VITE_DEV_DEBUGGER_START_HIDDEN?: 'true' | 'false'
    /**
     * Enables the dev-debug quick login feature in DevDebugger.
     * Must be exactly 'true' to activate. Any other value or absence = disabled.
     * @see doc/tasks/backlog/101-dev-debug-login.md
     */
    readonly VITE_LOGIN_WITH_DEVDEBUG?: 'true' | 'false'
    /**
     * Comma-separated list of environments where dev-debug login is allowed.
     * Example: 'dev,devtest'
     * @see doc/tasks/backlog/101-dev-debug-login.md
     */
    readonly VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS?: string
    /**
     * Current application environment, used to validate against VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS.
     * Example: 'dev' | 'devtest' | 'production'
     * @see doc/tasks/backlog/101-dev-debug-login.md
     */
    readonly VITE_APP_ENV?: string
    /**
     * Agent label shown in the browser tab title — slot letter + git issue number.
     * Injected by init.sh on every startup. Example: '[A:#065] '
     * Corresponds to VITE_AGENT_LABEL in code/webapp/.env
     */
    readonly VITE_AGENT_LABEL?: string
    /**
     * Full git branch name of the workspace at the time of startup.
     * Injected by init.sh on every startup. Example: 'feature/065-my-feature'
     * Shown in the Dev Debugger header for multi-branch dev work.
     */
    readonly VITE_GIT_BRANCH?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module '*.png' {
    const value: string
    export default value
}

declare module '*.jpg' {
    const value: string
    export default value
}

declare module '*.jpeg' {
    const value: string
    export default value
}

declare module '*.svg' {
    const value: string
    export default value
}

declare module '*.gif' {
    const value: string
    export default value
}

declare module '*.webp' {
    const value: string
    export default value
}
