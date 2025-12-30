# 💻 Task #010: Cash Adjustments Frontend Implementation

## 📖 Story

Como usuario del sistema (gerente, cajero, administrador), necesito interfaces visuales para gestionar cajas registradoras, terminales de pago, cuentas bancarias, y realizar cierres diarios de caja con captura de ingresos por medio de pago y registro de egresos operativos, para que pueda llevar un control diario del efectivo sin depender únicamente de APIs o interfaces externas.

---

## ✅ Technical Tasks

### Setup & Infrastructure

-   [ ] 🔧 Create TanStack Query hooks for cash adjustments API

    -   `useCashRegisters()` - List with filters (branch, type, active)
    -   `useCashRegister(id)` - Single register detail
    -   `useCreateCashRegister()` - Mutation for creation
    -   `useUpdateCashRegister()` - Mutation for updates
    -   `useDeleteCashRegister()` - Mutation for deletion
    -   Similar patterns for terminals, bank accounts, sessions, adjustments, expenses

-   [ ] 🔧 Create TypeScript types for API responses

    -   `CashRegister`, `CashRegisterType` enum
    -   `CashTerminal`, `BankAccount`
    -   `CashSession`, `SessionStatus` enum
    -   `CashAdjustment`, `AdjustmentType` enum, `Direction` enum
    -   `CashAdjustmentLine`, `TenderType` enum
    -   `CashExpense`
    -   Response wrappers: `PaginatedResponse<T>`, `ApiResponse<T>`

-   [ ] 🔧 Create API client functions in `src/lib/api/`
    -   `/cash-registers.ts` - 5 endpoints
    -   `/cash-terminals.ts` - 4 endpoints
    -   `/bank-accounts.ts` - 4 endpoints
    -   `/cash-sessions.ts` - 5 endpoints
    -   `/cash-adjustments.ts` - 5 endpoints
    -   `/cash-expenses.ts` - 4 endpoints

### Components - Cash Registers

-   [ ] 🎨 Create `CashRegisterList` component

    -   Display: DataGrid with columns (code, name, type, branch, active status)
    -   Actions: View, Edit, Delete buttons
    -   Filters: Branch selector, type dropdown, active toggle
    -   Badge styling for type: ON_PREMISE (blue), DELIVERY (green), EVENT (purple)

-   [ ] 🎨 Create `CashRegisterForm` component

    -   Fields: code (text, required, unique), name (text, required), branch_id (select, required), operating_unit_id (select, conditional), type (select, required), is_active (toggle), meta (textarea, optional JSON)
    -   Validation: Zod schema with unique code check, valid branch
    -   Conditional: Show operating_unit_id selector only if type = EVENT
    -   Mode: Create or Edit (with pre-filled data)

-   [ ] 🎨 Create `CashRegisterDetails` component
    -   Display: Full register info with branch and operating unit details
    -   Stats: Total sessions count, active sessions count
    -   Actions: Edit, Deactivate/Activate, Delete (if no sessions)
    -   Related: List recent sessions with links

### Components - Cash Terminals & Bank Accounts

-   [ ] 🎨 Create `CashTerminalList` component

    -   Display: DataGrid with columns (name, provider, last_four, branch, active status)
    -   Actions: Edit, Delete
    -   Filters: Branch, provider, active status

-   [ ] 🎨 Create `CashTerminalForm` component

    -   Fields: branch_id, name, provider (select: CLIP, MERCADOPAGO, STRIPE, SQUARE, OTHER), account_ref, last_four, is_active, meta
    -   Validation: Zod schema, required fields

-   [ ] 🎨 Create `BankAccountList` component

    -   Display: DataGrid with columns (alias, bank_name, masked account, branch, active status)
    -   Actions: Edit, Delete
    -   Security: Show masked data only (account_number_masked, clabe_masked)

-   [ ] 🎨 Create `BankAccountForm` component
    -   Fields: branch_id, alias, bank_name, account_number_masked (last 4 digits), clabe_masked (first 3 + last 4), is_active, meta
    -   Validation: Zod schema
    -   Note: Input format guidance for masked fields

### Components - Cash Sessions

-   [ ] 🎨 Create `CashSessionList` component

    -   Display: DataGrid with columns (operating_date, register, status, opening_balance, closing_balance, actions)
    -   Filters: Register selector, date range picker, status dropdown
    -   Badge styling: DRAFT (yellow), POSTED (green)
    -   Actions: View details, Post (if DRAFT)
    -   Summary row: Total sessions, total closing balance

-   [ ] 🎨 Create `CashSessionDetails` component

    -   Display: Session header (date, register, status, balances)
    -   Tabs:
        -   **Adjustments**: List of adjustments with expand/collapse for lines
        -   **Expenses**: List of expenses grouped by category
        -   **Summary**: Grouped totals by tender type (cash, card, transfer)
    -   Actions: Add adjustment, Add expense (if DRAFT), Post session
    -   Calculations: Real-time closing balance calculation

-   [x] 🎨 Create `OpenSessionDialog` component
    -   Fields: cash_register_id (select, required), operating_date (date picker, default today), opening_balance (number, optional)
    -   Validation: Prevent duplicate sessions (same register + date)
    -   Trigger: Button on sessions list page
    -   Result: Navigate to new session details after creation

### Components - Cash Adjustments

-   [ ] 🎨 Create `CashAdjustmentCard` component

    -   Display: Adjustment header (type, direction, source_system, posted status)
    -   Expandable: Show/hide lines table
    -   Lines table: tender_type, amount, terminal/account reference
    -   Badge styling: EXTERNAL_IMPORT (blue), CORRECTION (orange), INFLOW (green), OUTFLOW (red)
    -   Actions: Post (if not posted), Delete (if DRAFT session)

-   [ ] 🎨 Create `CreateAdjustmentDialog` component

    -   Step 1: Select type (EXTERNAL_IMPORT or CORRECTION), direction (INFLOW/OUTFLOW)
    -   Step 2: Add lines dynamically (tender_type selector, amount input, conditional terminal/account selector)
    -   Step 3: Add source_system (if EXTERNAL_IMPORT) and notes (required if CORRECTION)
    -   Validation: At least 1 line, CARD requires terminal, TRANSFER requires bank account
    -   Dynamic lines: Add/remove line buttons
    -   Preview: Total amount before submission

-   [ ] 🎨 Create `AdjustmentLineRow` component
    -   Fields: tender_type (select), amount (number), currency (default MXN), card_terminal_id (select, conditional), bank_account_id (select, conditional), reference (text), meta (textarea, optional)
    -   Conditional rendering: Show terminal selector if CARD, show bank account selector if TRANSFER
    -   Validation: amount > 0, required fields based on tender_type

### Components - Cash Expenses

-   [ ] 🎨 Create `CashExpenseCard` component

    -   Display: Expense header (category, vendor, amount, tender_type, incurred_at, posted status)
    -   Details: reference, notes, terminal/account info
    -   Badge styling: Category badge, tender_type badge
    -   Actions: Post (if not posted), Delete (if DRAFT session)

-   [ ] 🎨 Create `CreateExpenseDialog` component
    -   Fields: tender_type, amount, category (select or freetext), vendor, reference, notes (textarea), card_terminal_id (conditional), bank_account_id (conditional), incurred_at (datetime picker, default now)
    -   Validation: Zod schema, tender validation (CARD → terminal, TRANSFER → bank_account)
    -   Categories: Predefined list (Supplies, Maintenance, Transportation, Salaries, Other) + custom input

### Pages - Main Views

-   [ ] 📄 Create `/cash/registers` page

    -   Layout: DataGrid with filters sidebar
    -   Components: CashRegisterList, filters, Create button
    -   Actions: Navigate to details, open create dialog

-   [ ] 📄 Create `/cash/registers/:id` page

    -   Layout: Details view with tabs (Info, Sessions)
    -   Components: CashRegisterDetails, related sessions list
    -   Actions: Edit, Delete, Navigate to session

-   [ ] 📄 Create `/cash/terminals` page

    -   Layout: DataGrid with branch filter
    -   Components: CashTerminalList, Create button
    -   Actions: Edit dialog, Delete confirmation

-   [ ] 📄 Create `/cash/bank-accounts` page

    -   Layout: DataGrid with branch filter
    -   Components: BankAccountList, Create button
    -   Actions: Edit dialog, Delete confirmation

-   [ ] 📄 Create `/cash/sessions` page

    -   Layout: DataGrid with filters (register, date range, status)
    -   Components: CashSessionList, Open session button
    -   Summary: Daily totals by tender type (visual chart)

-   [ ] 📄 Create `/cash/sessions/:id` page
    -   Layout: Session details with tabs (Adjustments, Expenses, Summary)
    -   Components: CashSessionDetails, adjustment cards, expense cards, summary view
    -   Actions: Add adjustment, Add expense, Post session
    -   Real-time calculations: Closing balance updates as items are added

### Pages - Reports & Dashboard

-   [ ] 📄 Create `/cash/dashboard` page

    -   Display: Daily summary for current operating date
    -   Metrics: Total cash on hand, total card transactions, total transfers, pending sessions count
    -   Charts: Tender type distribution (pie chart), daily trend (line chart last 7 days)
    -   Quick actions: Open today's session, view pending sessions

-   [ ] 📄 Create `/cash/reports` page
    -   Filters: Branch, register, date range, tender type, category (for expenses)
    -   Report types:
        -   Daily Close Summary: Grouped by register and tender
        -   Expense Report: Grouped by category and tender
        -   Variance Report: Expected vs actual (future)
    -   Export: CSV download button
    -   Visual: DataGrid with grouping and aggregations

### Navigation & Routing

-   [ ] 🧭 Add Cash Management section to main navigation

    -   Menu items: Dashboard, Sessions, Registers, Terminals, Bank Accounts, Reports
    -   Icons: TrendingUp (dashboard), DollarSign (sessions), Server (registers), CreditCard (terminals), Building (bank accounts), FileText (reports)
    -   Permissions: Show/hide based on user permissions (cash-\*.view)

-   [ ] 🧭 Create TanStack Router routes
    -   `/cash` → redirect to `/cash/dashboard`
    -   `/cash/dashboard` → Cash Dashboard
    -   `/cash/sessions` → Sessions List
    -   `/cash/sessions/:id` → Session Details
    -   `/cash/registers` → Registers List
    -   `/cash/registers/:id` → Register Details
    -   `/cash/terminals` → Terminals List
    -   `/cash/bank-accounts` → Bank Accounts List
    -   `/cash/reports` → Reports Page

### UI/UX Enhancements

-   [ ] 🎨 Create dark mode support for all new components

    -   Badge variants with dark:bg-{color}-950/50 pattern
    -   DataGrid with dark:border-border and dark:bg-card
    -   Forms with dark:bg-background
    -   Dialogs with dark:bg-card

-   [ ] 🎨 Create responsive layouts for mobile

    -   DataGrid responsive breakpoints
    -   Filters collapse to drawer on mobile
    -   Forms adapt to single column layout
    -   Cards stack vertically on small screens

-   [ ] 🎨 Create loading states

    -   Skeleton loaders for DataGrid
    -   Spinner for form submissions
    -   Optimistic updates for mutations

-   [ ] 🎨 Create error handling
    -   Toast notifications for API errors
    -   Inline validation errors in forms
    -   Retry buttons for failed requests
    -   404 pages for invalid routes

### State Management

-   [ ] 🔧 Create Zustand store for cash session UI state

    -   Current active session (optional)
    -   Filters state (registers, dates, status)
    -   UI flags (dialogs open/closed, selected items)

-   [ ] 🔧 Create form state management with React Hook Form
    -   Zod schemas for all forms
    -   Field validation with error messages
    -   Conditional field rendering based on selections

### Testing

-   [ ] 🧪 Create component tests with Vitest + Testing Library

    -   CashRegisterForm: validation, submission, edit mode
    -   CreateAdjustmentDialog: multi-step flow, line management
    -   CashSessionDetails: balance calculation, tab switching
    -   DataGrid: filtering, sorting, pagination

-   [ ] 🧪 Create integration tests

    -   Full session flow: open → add adjustments → add expenses → post
    -   Register management: create → edit → deactivate → delete protection

-   [ ] 🧪 Create E2E tests with Playwright (optional)
    -   Daily close workflow end-to-end
    -   Multi-user concurrency (prevent duplicate sessions)

### Documentation

-   [ ] 📝 Update UI documentation

    -   Add Cash Management section to user guide
    -   Document daily close workflow with screenshots
    -   Explain tender type validation rules
    -   Document permission requirements per action

-   [ ] 📝 Create component documentation
    -   Storybook stories for all major components
    -   Props documentation with TypeScript
    -   Usage examples with code snippets

---

## ⏱️ Time

### 📊 Estimates

-   **Optimistic:** `28h`
-   **Pessimistic:** `48h`
-   **Tracked:** `0h`

### 📅 Sessions

```json
[]
```

---

## 📝 Notes

### Technical Decisions

1. **Component Library**: Continue using Shadcn/ui components (Button, Dialog, Form, DataGrid, Badge, Card)
2. **Form Management**: React Hook Form + Zod for validation
3. **State Management**: TanStack Query for server state, Zustand for UI state
4. **Routing**: TanStack Router with type-safe routes and search params
5. **Styling**: Tailwind CSS with dark mode support
6. **Icons**: Lucide React icons

### UI Patterns

1. **DataGrid**: Reuse existing DataGrid component with filters, sorting, pagination
2. **Forms**: Dialog-based for create/edit (except large wizards)
3. **Details**: Full-page views with tabs for related data
4. **Cards**: Expandable cards for adjustments and expenses within session view
5. **Badges**: Color-coded for types, statuses, tender types

### Form Validation Rules

1. **Cash Register**: Unique code, valid branch_id, operating_unit_id required if EVENT type
2. **Cash Terminal**: Valid branch_id, provider from enum, last_four numeric (4 digits)
3. **Bank Account**: Valid branch_id, masked formats validated
4. **Session**: Unique (register_id + operating_date), opening_balance >= 0 if provided
5. **Adjustment Lines**: amount > 0, terminal_id if CARD, bank_account_id if TRANSFER
6. **Expense**: amount > 0, category required, tender_type validation same as adjustment lines

### Calculation Logic (Frontend Validation)

```typescript
// Closing Balance = Opening + Incomes - Expenses
const calculateClosingBalance = (
    openingBalance: number,
    adjustments: CashAdjustment[],
    expenses: CashExpense[]
): number => {
    const incomes = adjustments
        .filter((adj) => adj.direction === "INFLOW")
        .reduce(
            (sum, adj) => sum + adj.lines.reduce((s, l) => s + l.amount, 0),
            0
        );

    const outflows = adjustments
        .filter((adj) => adj.direction === "OUTFLOW")
        .reduce(
            (sum, adj) => sum + adj.lines.reduce((s, l) => s + l.amount, 0),
            0
        );

    const expensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return openingBalance + incomes - outflows - expensesTotal;
};
```

### Component Dependencies

**Pages depend on:**

-   API hooks (TanStack Query)
-   Layout components (DataGrid, filters)
-   Form components (dialogs, inputs)
-   Domain components (cards, details)

**Forms depend on:**

-   React Hook Form
-   Zod schemas
-   Shadcn/ui primitives (Input, Select, Textarea, DatePicker)

**Lists depend on:**

-   DataGrid component
-   Badge component
-   Filter components

### Permission Mapping

| Action            | Permission                | UI Effect                                     |
| ----------------- | ------------------------- | --------------------------------------------- |
| View registers    | `cash-registers.view`     | Show menu item, allow page access             |
| Create register   | `cash-registers.create`   | Show Create button                            |
| Edit register     | `cash-registers.update`   | Show Edit button                              |
| Delete register   | `cash-registers.delete`   | Show Delete button                            |
| View sessions     | `cash-sessions.view`      | Show menu item, allow page access             |
| Open session      | `cash-sessions.create`    | Show Open Session button                      |
| Post session      | `cash-sessions.post`      | Show Post button (if DRAFT)                   |
| Create adjustment | `cash-adjustments.create` | Show Add Adjustment button (if session DRAFT) |
| Post adjustment   | `cash-adjustments.post`   | Show Post button on adjustment card           |
| Create expense    | `cash-expenses.create`    | Show Add Expense button (if session DRAFT)    |
| Post expense      | `cash-expenses.post`      | Show Post button on expense card              |

---

## 🔗 Related Tasks

-   Task 009: Cash Adjustments Backend (dependency)
-   Task 008: Cash Adjustments Architecture Diagrams (reference)
-   Task 006: Inventory Product Onboarding (pattern reference for forms and DataGrid)

---

## ✅ Definition of Done

-   [ ] All API hooks created and tested with TanStack Query
-   [ ] TypeScript types match backend API responses
-   [ ] 15+ reusable components created
-   [ ] 7 main pages with full functionality
-   [ ] Navigation integrated with permissions
-   [ ] Dark mode support across all components
-   [ ] Responsive design for mobile and tablet
-   [ ] Form validation with Zod schemas
-   [ ] Error handling and loading states
-   [ ] Real-time closing balance calculation
-   [ ] Permission-based UI rendering
-   [ ] Component tests with 80%+ coverage
-   [ ] User documentation with screenshots
-   [ ] Storybook stories for major components
-   [ ] E2E test for daily close workflow (optional)
