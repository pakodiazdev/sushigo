export interface DemoAccount {
  email: string
}

/** GET /api/v1/app-info (#635) — public runtime information, never credentials. */
export interface AppInfo {
  environment: string
  is_demo: boolean
  data_resets: boolean
  demo_account: DemoAccount | null
}

export interface AppInfoResponse {
  status: number
  data: AppInfo
  meta: unknown
}
