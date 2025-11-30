# 💰 Task #009: Cash Adjustments Backend Implementation

## 📖 Story

Como desarrollador backend, necesito implementar el módulo de ajustes de caja con sus tablas, modelos, servicios y endpoints REST, para que el sistema pueda registrar los cierres diarios por caja (local, delivery, eventos) con sus ingresos por medio de pago (efectivo, tarjeta, transferencia) y egresos operativos, garantizando la conciliación y trazabilidad completa del flujo de efectivo.

---

## ✅ Technical Tasks

### Database Schema

-   [ ] 📂 Create migration `create_cash_registers_table.php`

    -   Fields: id, branch_id (FK), operating_unit_id (FK nullable), code (unique), name, type (enum: ON_PREMISE/DELIVERY/EVENT), is_active, meta (json), timestamps
    -   Indexes: branch_id, operating_unit_id, code, type, is_active
    -   Unique constraint: code

-   [ ] 📂 Create migration `create_cash_terminals_table.php`

    -   Fields: id, branch_id (FK), name, provider, account_ref, last_four, is_active, meta (json), timestamps
    -   Indexes: branch_id, provider, is_active
    -   Purpose: TPV/POS terminals for card payments per branch

-   [ ] 📂 Create migration `create_bank_accounts_table.php`

    -   Fields: id, branch_id (FK), alias, bank_name, account_number_masked, clabe_masked, is_active, meta (json), timestamps
    -   Indexes: branch_id, is_active
    -   Purpose: Destination accounts for transfer tender type

-   [ ] 📂 Create migration `create_cash_sessions_table.php`

    -   Fields: id, cash_register_id (FK), operating_date (date), status (enum: DRAFT/POSTED), opening_balance (decimal nullable), closing_balance (decimal), meta (json), timestamps
    -   Indexes: cash_register_id, operating_date, status
    -   Unique constraint: (cash_register_id, operating_date)
    -   Purpose: Daily operating session per register

-   [ ] 📂 Create migration `create_cash_adjustments_table.php`

    -   Fields: id, cash_session_id (FK), source_system, type (enum: EXTERNAL_IMPORT/CORRECTION), direction (enum: INFLOW/OUTFLOW), notes (text nullable), posted_by (FK users, nullable), posted_at (timestamp nullable), meta (json), timestamps
    -   Indexes: cash_session_id, type, direction, posted_by, posted_at
    -   Purpose: Header for income/expense adjustments

-   [ ] 📂 Create migration `create_cash_adjustment_lines_table.php`

    -   Fields: id, cash_adjustment_id (FK), tender_type (enum: CASH/CARD/TRANSFER), amount (decimal), currency (default MXN), card_terminal_id (FK nullable), bank_account_id (FK nullable), reference, meta (json), created_at
    -   Indexes: cash_adjustment_id, tender_type, card_terminal_id, bank_account_id
    -   Purpose: Tender-level breakdown per adjustment

-   [ ] 📂 Create migration `create_cash_expenses_table.php`
    -   Fields: id, cash_session_id (FK), tender_type (enum: CASH/CARD/TRANSFER), amount (decimal), category, vendor, reference, notes (text nullable), card_terminal_id (FK nullable), bank_account_id (FK nullable), incurred_at (timestamp), created_by (FK users), posted_by (FK users nullable), posted_at (timestamp nullable), meta (json), timestamps
    -   Indexes: cash_session_id, tender_type, category, created_by, posted_by, incurred_at
    -   Purpose: Operational expenses paid from registers

### Models & Relationships

-   [ ] 🔧 Create `CashRegister` model

    -   Fillable: branch_id, operating_unit_id, code, name, type, is_active, meta
    -   Casts: is_active → boolean, meta → array, type → enum
    -   Relationships: belongsTo(Branch), belongsTo(OperatingUnit), hasMany(CashSession)
    -   Scopes: active(), byBranch(), byType()
    -   Validation: code unique, type in [ON_PREMISE, DELIVERY, EVENT]

-   [ ] 🔧 Create `CashTerminal` model

    -   Fillable: branch_id, name, provider, account_ref, last_four, is_active, meta
    -   Casts: is_active → boolean, meta → array
    -   Relationships: belongsTo(Branch), hasMany(CashAdjustmentLine), hasMany(CashExpense)
    -   Scopes: active(), byBranch(), byProvider()

-   [ ] 🔧 Create `BankAccount` model

    -   Fillable: branch_id, alias, bank_name, account_number_masked, clabe_masked, is_active, meta
    -   Casts: is_active → boolean, meta → array
    -   Relationships: belongsTo(Branch), hasMany(CashAdjustmentLine), hasMany(CashExpense)
    -   Scopes: active(), byBranch()

-   [ ] 🔧 Create `CashSession` model

    -   Fillable: cash_register_id, operating_date, status, opening_balance, closing_balance, meta
    -   Casts: operating_date → date, opening_balance → decimal:4, closing_balance → decimal:4, meta → array, status → enum
    -   Relationships: belongsTo(CashRegister), hasMany(CashAdjustment), hasMany(CashExpense)
    -   Scopes: draft(), posted(), byRegister(), byDate(), byDateRange()
    -   Methods: calculateClosingBalance(), post(User)
    -   Validation: unique (cash_register_id, operating_date)

-   [ ] 🔧 Create `CashAdjustment` model

    -   Fillable: cash_session_id, source_system, type, direction, notes, posted_by, posted_at, meta
    -   Casts: posted_at → datetime, meta → array, type → enum, direction → enum
    -   Relationships: belongsTo(CashSession), hasMany(CashAdjustmentLine), belongsTo(User as posted_by)
    -   Scopes: posted(), draft(), byType(), byDirection(), inflow(), outflow()
    -   Methods: post(User), getTotalAmount()

-   [ ] 🔧 Create `CashAdjustmentLine` model

    -   Fillable: cash_adjustment_id, tender_type, amount, currency, card_terminal_id, bank_account_id, reference, meta
    -   Casts: amount → decimal:4, meta → array, tender_type → enum
    -   Relationships: belongsTo(CashAdjustment), belongsTo(CashTerminal), belongsTo(BankAccount)
    -   Scopes: byTenderType(), cash(), card(), transfer()
    -   Validation: amount > 0, card_terminal_id required if CARD, bank_account_id required if TRANSFER

-   [ ] 🔧 Create `CashExpense` model
    -   Fillable: cash_session_id, tender_type, amount, category, vendor, reference, notes, card_terminal_id, bank_account_id, incurred_at, created_by, posted_by, posted_at, meta
    -   Casts: amount → decimal:4, incurred_at → datetime, posted_at → datetime, meta → array, tender_type → enum
    -   Relationships: belongsTo(CashSession), belongsTo(CashTerminal), belongsTo(BankAccount), belongsTo(User as created_by), belongsTo(User as posted_by)
    -   Scopes: posted(), draft(), byCategory(), byTenderType(), byDateRange()
    -   Methods: post(User)

### Services - Business Logic

-   [ ] 🔧 Create `CashSessionService`

    -   Method: `openSession(cashRegisterId, operatingDate, openingBalance = null)` → CashSession

        -   Validate: no existing session for same register and date
        -   Create session with status DRAFT
        -   Return session instance

    -   Method: `calculateClosingBalance(sessionId)` → decimal

        -   Sum all adjustment lines (INFLOW - OUTFLOW)
        -   Subtract all expenses
        -   Return: opening_balance + incomes - expenses

    -   Method: `postSession(sessionId, userId)` → CashSession
        -   Validate: all adjustments and expenses are posted
        -   Calculate and set closing_balance
        -   Set status to POSTED
        -   Transaction wrapper for atomicity

-   [ ] 🔧 Create `CashAdjustmentService`

    -   Method: `createAdjustment(sessionId, type, direction, lines, sourceSystem = null, notes = null)` → CashAdjustment

        -   Validate: session exists and is DRAFT
        -   Create adjustment header
        -   Create lines with tender validation (CARD requires terminal_id, TRANSFER requires bank_account_id)
        -   Transaction wrapper

    -   Method: `createFromExternalReport(sessionId, reportData)` → CashAdjustment

        -   Parse external system format
        -   Map to adjustment + lines structure
        -   Set type = EXTERNAL_IMPORT, direction = INFLOW
        -   Call createAdjustment internally

    -   Method: `createCorrection(sessionId, lines, notes)` → CashAdjustment

        -   Create adjustment with type = CORRECTION
        -   Allow both INFLOW and OUTFLOW lines
        -   Require notes for audit trail

    -   Method: `postAdjustment(adjustmentId, userId)` → CashAdjustment
        -   Set posted_by and posted_at
        -   Validate all lines have valid references
        -   Return updated adjustment

-   [ ] 🔧 Create `CashExpenseService`

    -   Method: `registerExpense(sessionId, tenderType, amount, category, vendor, reference, notes = null, terminalId = null, bankAccountId = null, incurredAt = null)` → CashExpense

        -   Validate: session exists and is DRAFT
        -   Validate: tender_type matches terminal/bank_account presence
        -   Set created_by from authenticated user
        -   Default incurred_at to now() if not provided

    -   Method: `postExpense(expenseId, userId)` → CashExpense
        -   Set posted_by and posted_at
        -   Validate expense belongs to DRAFT session
        -   Return updated expense

-   [ ] 🔧 Create `CashReconciliationService` (future-ready structure)

    -   Method: `getVariance(sessionId)` → array

        -   Calculate expected vs actual closing balance
        -   Return detailed breakdown by tender type

    -   Method: `generateDailySummary(sessionId)` → array
        -   Group incomes by tender type
        -   Group expenses by category
        -   Calculate net cash flow
        -   Return summary structure

### API Controllers (SAC Pattern)

#### Cash Registers

-   [ ] 🌐 Create `ListCashRegistersController`

    -   GET /api/v1/cash-registers
    -   Query params: branch_id, type, is_active
    -   Response: paginated list with branch and operating_unit data

-   [ ] 🌐 Create `CreateCashRegisterController`

    -   POST /api/v1/cash-registers
    -   Request: CreateCashRegisterRequest (code, name, branch_id, operating_unit_id nullable, type, is_active, meta)
    -   Validation: unique code, valid branch_id, valid operating_unit_id if provided, type in enum
    -   Permission: cash-registers.create

-   [ ] 🌐 Create `ShowCashRegisterController`

    -   GET /api/v1/cash-registers/{id}
    -   Response: full register data with relationships

-   [ ] 🌐 Create `UpdateCashRegisterController`

    -   PUT /api/v1/cash-registers/{id}
    -   Request: UpdateCashRegisterRequest
    -   Validation: same as create (except unique code check excludes current register)
    -   Permission: cash-registers.update

-   [ ] 🌐 Create `DeleteCashRegisterController`
    -   DELETE /api/v1/cash-registers/{id}
    -   Protection: prevent deletion if has sessions
    -   Permission: cash-registers.delete

#### Cash Terminals

-   [ ] 🌐 Create `ListCashTerminalsController`

    -   GET /api/v1/cash-terminals
    -   Query params: branch_id, provider, is_active

-   [ ] 🌐 Create `CreateCashTerminalController`

    -   POST /api/v1/cash-terminals
    -   Request: CreateCashTerminalRequest (branch_id, name, provider, account_ref, last_four, is_active, meta)

-   [ ] 🌐 Create `UpdateCashTerminalController`

    -   PUT /api/v1/cash-terminals/{id}

-   [ ] 🌐 Create `DeleteCashTerminalController`
    -   DELETE /api/v1/cash-terminals/{id}
    -   Protection: prevent deletion if referenced in lines

#### Bank Accounts

-   [ ] 🌐 Create `ListBankAccountsController`

    -   GET /api/v1/bank-accounts
    -   Query params: branch_id, is_active

-   [ ] 🌐 Create `CreateBankAccountController`

    -   POST /api/v1/bank-accounts
    -   Request: CreateBankAccountRequest (branch_id, alias, bank_name, account_number_masked, clabe_masked, is_active, meta)

-   [ ] 🌐 Create `UpdateBankAccountController`

    -   PUT /api/v1/bank-accounts/{id}

-   [ ] 🌐 Create `DeleteBankAccountController`
    -   DELETE /api/v1/bank-accounts/{id}
    -   Protection: prevent deletion if referenced in lines

#### Cash Sessions

-   [ ] 🌐 Create `ListCashSessionsController`

    -   GET /api/v1/cash-sessions
    -   Query params: cash_register_id, operating_date_from, operating_date_to, status
    -   Response: paginated list with register data and session summaries

-   [ ] 🌐 Create `OpenCashSessionController`

    -   POST /api/v1/cash-sessions
    -   Request: OpenCashSessionRequest (cash_register_id, operating_date, opening_balance nullable)
    -   Uses: CashSessionService::openSession()
    -   Permission: cash-sessions.create

-   [ ] 🌐 Create `ShowCashSessionController`

    -   GET /api/v1/cash-sessions/{id}
    -   Response: full session with adjustments, lines, expenses

-   [ ] 🌐 Create `PostCashSessionController`

    -   POST /api/v1/cash-sessions/{id}/post
    -   Uses: CashSessionService::postSession()
    -   Validates: all adjustments and expenses are posted
    -   Permission: cash-sessions.post

-   [ ] 🌐 Create `GetSessionSummaryController`
    -   GET /api/v1/cash-sessions/{id}/summary
    -   Uses: CashReconciliationService::generateDailySummary()
    -   Response: grouped incomes, expenses, closing balance

#### Cash Adjustments

-   [ ] 🌐 Create `ListCashAdjustmentsController`

    -   GET /api/v1/cash-adjustments
    -   Query params: cash_session_id, type, direction, posted (boolean)

-   [ ] 🌐 Create `CreateCashAdjustmentController`

    -   POST /api/v1/cash-adjustments
    -   Request: CreateCashAdjustmentRequest (cash_session_id, type, direction, source_system, notes, lines[])
    -   Uses: CashAdjustmentService::createAdjustment()
    -   Permission: cash-adjustments.create

-   [ ] 🌐 Create `CreateCorrectionController`

    -   POST /api/v1/cash-adjustments/correction
    -   Request: CreateCorrectionRequest (cash_session_id, notes required, lines[])
    -   Uses: CashAdjustmentService::createCorrection()
    -   Permission: cash-adjustments.correct

-   [ ] 🌐 Create `PostCashAdjustmentController`

    -   POST /api/v1/cash-adjustments/{id}/post
    -   Uses: CashAdjustmentService::postAdjustment()
    -   Permission: cash-adjustments.post

-   [ ] 🌐 Create `ShowCashAdjustmentController`
    -   GET /api/v1/cash-adjustments/{id}
    -   Response: adjustment with lines and related entities

#### Cash Expenses

-   [ ] 🌐 Create `ListCashExpensesController`

    -   GET /api/v1/cash-expenses
    -   Query params: cash_session_id, category, tender_type, incurred_from, incurred_to

-   [ ] 🌐 Create `CreateCashExpenseController`

    -   POST /api/v1/cash-expenses
    -   Request: CreateCashExpenseRequest (cash_session_id, tender_type, amount, category, vendor, reference, notes, terminal_id, bank_account_id, incurred_at)
    -   Uses: CashExpenseService::registerExpense()
    -   Permission: cash-expenses.create

-   [ ] 🌐 Create `PostCashExpenseController`

    -   POST /api/v1/cash-expenses/{id}/post
    -   Uses: CashExpenseService::postExpense()
    -   Permission: cash-expenses.post

-   [ ] 🌐 Create `ShowCashExpenseController`
    -   GET /api/v1/cash-expenses/{id}

### Permissions & Policies

-   [ ] 🔐 Create permissions in `PermissionSeeder`

    -   cash-registers.view, cash-registers.create, cash-registers.update, cash-registers.delete
    -   cash-terminals.view, cash-terminals.create, cash-terminals.update, cash-terminals.delete
    -   bank-accounts.view, bank-accounts.create, bank-accounts.update, bank-accounts.delete
    -   cash-sessions.view, cash-sessions.create, cash-sessions.post
    -   cash-adjustments.view, cash-adjustments.create, cash-adjustments.post, cash-adjustments.correct
    -   cash-expenses.view, cash-expenses.create, cash-expenses.post

-   [ ] 🔐 Create `CashRegisterPolicy`

    -   viewAny: requires cash-registers.view + branch access via OperatingUnitUser
    -   create: requires cash-registers.create + branch access
    -   update: requires cash-registers.update + branch access
    -   delete: requires cash-registers.delete + no existing sessions

-   [ ] 🔐 Create `CashSessionPolicy`

    -   viewAny: requires cash-sessions.view + register branch access
    -   create: requires cash-sessions.create + register branch access
    -   post: requires cash-sessions.post + register branch access + session is DRAFT

-   [ ] 🔐 Create `CashAdjustmentPolicy`

    -   create: requires cash-adjustments.create + session branch access + session is DRAFT
    -   post: requires cash-adjustments.post + adjustment not yet posted

-   [ ] 🔐 Create `CashExpensePolicy`
    -   create: requires cash-expenses.create + session branch access + session is DRAFT
    -   post: requires cash-expenses.post + expense not yet posted

### Seeders

-   [ ] 🌱 Create `CashRegisterSeeder`

    -   Seed 1 ON_PREMISE register per branch (code: REG-001)
    -   Seed 1 DELIVERY register per branch (code: REG-002)
    -   Seed 1 EVENT register linked to event operating unit (code: REG-003)

-   [ ] 🌱 Create `CashTerminalSeeder`

    -   Seed 2 terminals per branch (providers: CLIP, MERCADOPAGO)
    -   Include account_ref and last_four

-   [ ] 🌱 Create `BankAccountSeeder`
    -   Seed 1 bank account per branch (BBVA, masked account/CLABE)

### Testing

-   [ ] 🧪 Create `CashRegisterTest`

    -   Test: create register with valid data
    -   Test: prevent duplicate code
    -   Test: prevent deletion with existing sessions
    -   Test: scope by branch
    -   Test: filter by type

-   [ ] 🧪 Create `CashSessionTest`

    -   Test: open session with valid register and date
    -   Test: prevent duplicate session for same register/date
    -   Test: calculate closing balance correctly
    -   Test: post session changes status to POSTED
    -   Test: prevent posting session with unposted adjustments

-   [ ] 🧪 Create `CashAdjustmentTest`

    -   Test: create adjustment with lines
    -   Test: validate CARD lines require terminal_id
    -   Test: validate TRANSFER lines require bank_account_id
    -   Test: calculate total amount from lines
    -   Test: post adjustment sets posted_by and posted_at

-   [ ] 🧪 Create `CashExpenseTest`

    -   Test: create expense with valid data
    -   Test: validate tender_type matches terminal/bank_account
    -   Test: post expense sets posted_by and posted_at
    -   Test: expense decreases closing_balance

-   [ ] 🧪 Create `CashReconciliationTest`
    -   Test: generate daily summary with grouped data
    -   Test: calculate variance between expected and actual
    -   Test: handle multiple tender types correctly

### Documentation

-   [ ] 📝 Add OpenAPI annotations to all FormRequests

    -   Document all fields with types, formats, enums
    -   Include examples for each request
    -   Document validation rules

-   [ ] 📝 Add OpenAPI annotations to all Controllers

    -   Document response structures
    -   Include error responses (422, 403, 404)
    -   Add security requirements (bearer token)

-   [ ] 📝 Generate Swagger documentation

    -   Run: php artisan l5-swagger:generate
    -   Verify all endpoints appear in /api/documentation

-   [ ] 📝 Update TESTING.md
    -   Document test user credentials
    -   List all new endpoints with example requests
    -   Explain permission structure

---

## ⏱️ Time

### 📊 Estimates

-   **Optimistic:** `24h`
-   **Pessimistic:** `40h`
-   **Tracked:** `0h`

### 📅 Sessions

```json
[]
```

---

## 📝 Notes

### Business Rules

1. **Session Uniqueness**: One session per register per operating date
2. **Tender Validation**:
    - CARD requires card_terminal_id
    - TRANSFER requires bank_account_id
    - CASH requires neither
3. **Posting Flow**: Adjustments and expenses must be posted before session can be posted
4. **Closing Balance**: opening_balance + sum(INFLOW lines) - sum(OUTFLOW lines) - sum(expenses)
5. **Deletion Protection**:
    - Cannot delete registers with sessions
    - Cannot delete terminals/accounts referenced in lines

### Technical Decisions

1. **Enum Values**: Store as strings in DB for clarity (ON_PREMISE, DELIVERY, EVENT, DRAFT, POSTED, CASH, CARD, TRANSFER)
2. **Decimal Precision**: Use decimal:4 for all amounts (supports up to 0.0001 precision)
3. **Meta Fields**: Store additional context as JSON (external system references, tips, fees)
4. **Audit Trail**: All mutations track created_by, posted_by with timestamps
5. **SAC Pattern**: Single Action Controllers for clear separation of concerns

### Migration Order

1. cash_registers (depends on: branches, operating_units)
2. cash_terminals (depends on: branches)
3. bank_accounts (depends on: branches)
4. cash_sessions (depends on: cash_registers)
5. cash_adjustments (depends on: cash_sessions, users)
6. cash_adjustment_lines (depends on: cash_adjustments, cash_terminals, bank_accounts)
7. cash_expenses (depends on: cash_sessions, cash_terminals, bank_accounts, users)

---

## 🔗 Related Tasks

-   Task 008: Cash Adjustments Architecture Diagrams (completed)
-   Task 010: Cash Adjustments Frontend (pending)
-   Task 006: Inventory Product Onboarding (reference for patterns)

---

## ✅ Definition of Done

-   [ ] All 7 migrations created and executed successfully
-   [ ] All 7 models created with relationships and scopes
-   [ ] 3 service classes with complete business logic
-   [ ] 35+ controller endpoints following SAC pattern
-   [ ] 4 policy classes with permission checks
-   [ ] 3 seeders with realistic test data
-   [ ] 5+ test suites with 50+ assertions
-   [ ] OpenAPI documentation complete and generated
-   [ ] All endpoints return proper error responses
-   [ ] Permission system integrated with Spatie
-   [ ] Branch access control via OperatingUnitUser
-   [ ] Transaction wrappers on all multi-step operations
-   [ ] Validation prevents invalid state transitions
