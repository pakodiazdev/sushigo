// Cash Adjustments Module Types

// ============================================================================
// Enums
// ============================================================================

export enum CashRegisterType {
  ON_PREMISE = 'ON_PREMISE',
  DELIVERY = 'DELIVERY',
  EVENT = 'EVENT',
}

export enum SessionStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
}

export enum AdjustmentType {
  EXTERNAL_IMPORT = 'EXTERNAL_IMPORT',
  CORRECTION = 'CORRECTION',
}

export enum Direction {
  INFLOW = 'INFLOW',
  OUTFLOW = 'OUTFLOW',
}

export enum TenderType {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

// ============================================================================
// Base Types
// ============================================================================

export interface CashRegister {
  id: number
  branch_id: number
  operating_unit_id: number | null
  code: string
  name: string
  type: CashRegisterType
  is_active: boolean
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Relationships
  branch?: Branch
  operating_unit?: OperatingUnit | null
  sessions?: CashSession[]
}

export interface CashTerminal {
  id: number
  branch_id: number
  name: string
  provider: string
  account_ref: string
  last_four: string
  is_active: boolean
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Relationships
  branch?: Branch
}

export interface BankAccount {
  id: number
  branch_id: number
  alias: string
  bank_name: string
  account_number_masked: string
  clabe_masked: string
  is_active: boolean
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Relationships
  branch?: Branch
}

export interface CashSession {
  id: number
  cash_register_id: number
  operating_date: string
  opening_balance: string
  closing_balance: string | null
  current_balance?: string // Calculated field from backend
  status: SessionStatus
  opened_by: number
  opened_at: string
  posted_by: number | null
  posted_at: string | null
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Relationships
  cash_register?: CashRegister
  opened_by_user?: User
  posted_by_user?: User | null
  adjustments?: CashAdjustment[]
  expenses?: CashExpense[]
}

export interface CashAdjustment {
  id: number
  cash_session_id: number
  source_system: string | null
  type: AdjustmentType
  direction: Direction
  notes: string | null
  posted_by: number | null
  posted_at: string | null
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Relationships
  cash_session?: CashSession
  posted_by_user?: User | null
  lines?: CashAdjustmentLine[]
}

export interface CashAdjustmentLine {
  id: number
  cash_adjustment_id: number
  tender_type: TenderType
  amount: string
  currency: string
  card_terminal_id: number | null
  bank_account_id: number | null
  reference: string | null
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Relationships
  cash_adjustment?: CashAdjustment
  card_terminal?: CashTerminal | null
  bank_account?: BankAccount | null
}

export interface CashExpense {
  id: number
  cash_session_id: number
  tender_type: TenderType
  amount: string
  category: string
  vendor: string
  reference: string | null
  notes: string | null
  card_terminal_id: number | null
  bank_account_id: number | null
  incurred_at: string
  created_by: number
  posted_by: number | null
  posted_at: string | null
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Relationships
  cash_session?: CashSession
  card_terminal?: CashTerminal | null
  bank_account?: BankAccount | null
  created_by_user?: User
  posted_by_user?: User | null
}

// ============================================================================
// Related Types (from other modules)
// ============================================================================

export interface Branch {
  id: number
  name: string
  code: string
  is_active: boolean
}

export interface OperatingUnit {
  id: number
  branch_id: number
  name: string
  type: string
  is_active: boolean
}

export interface User {
  id: number
  name: string
  email: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  status: number
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  } | null
}

export interface EntityResponse<T> {
  status: number
  data: T
  meta?: Record<string, unknown> | null
}

export interface MessageResponse {
  message: string
}

// ============================================================================
// Session Summary Types
// ============================================================================

export interface SessionSummary {
  session: CashSession
  incomes: TenderSummary[]
  expenses: TenderSummary[]
  closing_balance: string
  total_incomes: string
  total_expenses: string
  current_balance: string
}

export interface TenderSummary {
  tender_type: TenderType
  amount: string
  count: number
  terminal?: CashTerminal
  bank_account?: BankAccount
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface CashRegisterFormData {
  code: string
  name: string
  branch_id: number
  operating_unit_id?: number | null
  type: CashRegisterType
  is_active: boolean
  meta?: Record<string, unknown>
}

export interface CashTerminalFormData {
  branch_id: number
  name: string
  provider: string
  account_ref: string
  last_four: string
  is_active: boolean
  meta?: Record<string, unknown>
}

export interface BankAccountFormData {
  branch_id: number
  alias: string
  bank_name: string
  account_number_masked: string
  clabe_masked: string
  is_active: boolean
  meta?: Record<string, unknown>
}

export interface CashSessionFormData {
  cash_register_id: number
  operating_date: string
  opening_balance?: string
  meta?: Record<string, unknown>
}

export interface CashAdjustmentFormData {
  cash_session_id: number
  source_system?: string
  type: AdjustmentType
  direction: Direction
  notes?: string
  meta?: Record<string, unknown>
  lines: CashAdjustmentLineFormData[]
}

export interface CashAdjustmentLineFormData {
  tender_type: TenderType
  amount: string
  currency?: string
  card_terminal_id?: number | null
  bank_account_id?: number | null
  reference?: string
  meta?: Record<string, unknown>
}

export interface CashExpenseFormData {
  cash_session_id: number
  tender_type: TenderType
  amount: string
  category: string
  vendor: string
  reference?: string
  notes?: string
  card_terminal_id?: number | null
  bank_account_id?: number | null
  incurred_at: string
  meta?: Record<string, unknown>
}

// ============================================================================
// Filter/Query Types
// ============================================================================

export interface CashRegisterFilters {
  branch_id?: number
  type?: CashRegisterType
  is_active?: boolean
  search?: string
  per_page?: number
  page?: number
}

export interface CashTerminalFilters {
  branch_id?: number
  provider?: string
  is_active?: boolean
  search?: string
  per_page?: number
  page?: number
}

export interface BankAccountFilters {
  branch_id?: number
  is_active?: boolean
  search?: string
  per_page?: number
  page?: number
}

export interface CashSessionFilters {
  cash_register_id?: number
  operating_date?: string
  status?: SessionStatus
  date_from?: string
  date_to?: string
  per_page?: number
  page?: number
}

export interface CashAdjustmentFilters {
  cash_session_id?: number
  type?: AdjustmentType
  direction?: Direction
  posted?: boolean
  per_page?: number
  page?: number
}

export interface CashExpenseFilters {
  cash_session_id?: number
  category?: string
  tender_type?: TenderType
  incurred_from?: string
  incurred_to?: string
  per_page?: number
  page?: number
}
