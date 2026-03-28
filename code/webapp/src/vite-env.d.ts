/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /**
   * Clock format used throughout the UI.
   * '12' = h:mm AM/PM (default)  |  '24' = HH:mm
   * @see doc/conventions/frontend/time-format.md
   */
  readonly VITE_TIME_FORMAT?: '12' | '24'
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
