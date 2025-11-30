# 💵 Daily Cash Adjustments — Proposal

**Scope**
Record end-of-day sales totals provided by the external POS, split by cash register (on-premise, delivery, event) and by tender (cash, card with terminal, transfer with bank account). This iteration only covers **incoming adjustments**; ticket-level sales capture is out of scope.

---

## 1) Current state (DB and docs)

-   Inventory-first schema in place: `branches`, `operating_units`, `inventory_locations`, `items`, `item_variants`, `stock*`, `media*`, plus users/permissions (Spatie).
-   No **sales**, **cash registers**, **terminals**, or **bank accounts** tables. The only sales hint is optional metadata on `stock_movements` and pricing fields in `stock_movement_lines`, so there is no cash or reconciliation support yet.
-   Multi-branch and operating-unit abstraction already exists and should anchor cash registers to stores and events.

---

## 2) Goals for the module

-   Store daily income per register using totals coming from the external system (not per ticket).
-   Tag each income by **tender**: cash, card (with the terminal used), or transfer (with the destination account).
-   Support multiple registers per branch: on-premise, delivery, and one linked to special events.
-   Link registers to `branch` and, when relevant, to an event `operating_unit`.
-   Ensure traceability: captured by user, external source, operating date, and baseline audit fields.

---

## 3) Proposed data model

> New tables live in the finance domain and relate to `branches` and optionally `operating_units`.

### 3.1) Entity-Relationship Diagram (ER)

```mermaid
erDiagram
    BRANCHES ||--o{ CASH_REGISTERS : "has"
    BRANCHES ||--o{ CASH_TERMINALS : "owns"
    BRANCHES ||--o{ BANK_ACCOUNTS : "manages"

    OPERATING_UNITS ||--o| CASH_REGISTERS : "associates (events)"

    CASH_REGISTERS ||--o{ CASH_SESSIONS : "generates"
    CASH_SESSIONS ||--o{ CASH_ADJUSTMENTS : "records"
    CASH_SESSIONS ||--o{ CASH_EXPENSES : "records"

    CASH_ADJUSTMENTS ||--o{ CASH_ADJUSTMENT_LINES : "details"

    CASH_TERMINALS ||--o{ CASH_ADJUSTMENT_LINES : "uses"
    CASH_TERMINALS ||--o{ CASH_EXPENSES : "uses"

    BANK_ACCOUNTS ||--o{ CASH_ADJUSTMENT_LINES : "receives"
    BANK_ACCOUNTS ||--o{ CASH_EXPENSES : "origin"

    USERS ||--o{ CASH_ADJUSTMENTS : "records"
    USERS ||--o{ CASH_EXPENSES : "creates"

    BRANCHES {
        bigint id PK
        string name
        string code
        boolean is_active
    }

    OPERATING_UNITS {
        bigint id PK
        bigint branch_id FK
        string name
        string type
        boolean is_active
    }

    CASH_REGISTERS {
        bigint id PK
        bigint branch_id FK
        bigint operating_unit_id FK "nullable"
        string code UK
        string name
        string type "ON_PREMISE|DELIVERY|EVENT"
        boolean is_active
        json meta
    }

    CASH_TERMINALS {
        bigint id PK
        bigint branch_id FK
        string name
        string provider
        string account_ref
        string last_four
        boolean is_active
        json meta
    }

    BANK_ACCOUNTS {
        bigint id PK
        bigint branch_id FK
        string alias
        string bank_name
        string account_number_masked
        string clabe_masked
        boolean is_active
        json meta
    }

    CASH_SESSIONS {
        bigint id PK
        bigint cash_register_id FK
        date operating_date
        string status "DRAFT|POSTED"
        decimal opening_balance "nullable"
        decimal closing_balance
        json meta
        timestamp created_at
        timestamp updated_at
        unique cash_register_id_operating_date
    }

    CASH_ADJUSTMENTS {
        bigint id PK
        bigint cash_session_id FK
        string source_system
        string type "EXTERNAL_IMPORT|CORRECTION"
        string direction "INFLOW|OUTFLOW"
        text notes
        bigint posted_by FK "nullable"
        timestamp posted_at "nullable"
        json meta
        timestamp created_at
        timestamp updated_at
    }

    CASH_ADJUSTMENT_LINES {
        bigint id PK
        bigint cash_adjustment_id FK
        string tender_type "CASH|CARD|TRANSFER"
        decimal amount
        string currency
        bigint card_terminal_id FK "nullable"
        bigint bank_account_id FK "nullable"
        string reference
        json meta
        timestamp created_at
    }

    CASH_EXPENSES {
        bigint id PK
        bigint cash_session_id FK
        string tender_type "CASH|CARD|TRANSFER"
        decimal amount
        string category
        string vendor
        string reference
        text notes
        bigint card_terminal_id FK "nullable"
        bigint bank_account_id FK "nullable"
        timestamp incurred_at
        bigint created_by FK
        bigint posted_by FK "nullable"
        timestamp posted_at "nullable"
        json meta
        timestamp created_at
        timestamp updated_at
    }

    USERS {
        bigint id PK
        string name
        string email
    }
```

### 3.2) Table Descriptions

**`cash_registers`** — register catalog per branch

-   `branch_id` (FK), `operating_unit_id` (nullable FK for events), `code`, `name`.
-   `type`: `ON_PREMISE` (store), `DELIVERY`, `EVENT`.
-   Flags: `is_active`, `meta` (aliases or IDs from the external system).

**`cash_terminals`** — card terminals per branch

-   `branch_id` (FK), `name` (operator alias), `provider`, `account_ref` (acquirer/merchant ID), `last_four`, `is_active`, `meta`.

**`bank_accounts`** — destination accounts for transfers

-   `branch_id` (FK), `alias`, `bank_name`, `account_number_masked`, `clabe_masked`, `is_active`, `meta`.

**`cash_sessions`** — operating day per register

-   `cash_register_id` (FK), `operating_date`, `status` (`DRAFT|POSTED`), `opening_balance` (nullable), `closing_balance` (computed from adjustments), `meta` (e.g., external batch id).
-   Unique on (`cash_register_id`, `operating_date`) to avoid duplicate daily sessions.

**`cash_adjustments`** — header for imported income/outflows

-   `cash_session_id` (FK), `source_system` (short text), `type` (`EXTERNAL_IMPORT|CORRECTION`), `direction` (`INFLOW|OUTFLOW`), `notes`, `posted_by`, `posted_at`, `meta`.
-   Used for daily totals from the other system; `OUTFLOW` is reserved for general withdrawals (e.g., vault transfer).

**`cash_adjustment_lines`** — tender-level breakdown

-   `cash_adjustment_id` (FK), `tender_type` (`CASH|CARD|TRANSFER`), `amount`, `currency` (`MXN` default), `card_terminal_id` (nullable FK), `bank_account_id` (nullable FK), `reference` (external batch id), `meta` (tips, fees).
-   Index by `tender_type` and `operating_date` (via `cash_sessions`) for daily reporting.

**`cash_expenses`** — outflows paid from on-premise/delivery registers

-   `cash_session_id` (FK), `tender_type` (`CASH|CARD|TRANSFER`), `amount`, `category`, `vendor`, `reference` (invoice/receipt), `notes`, `card_terminal_id` (nullable), `bank_account_id` (nullable), `incurred_at`, `created_by`, `posted_by`, `posted_at`, `meta`.
-   Decrease the session `closing_balance`. Cover ad-hoc operational spend taken from the most convenient register/terminal.

---

## 4) Operational flow (EOD)

### 4.1) Sequence Diagram - Daily Close

```mermaid
sequenceDiagram
    participant U as User/Cashier
    participant S as System
    participant CS as CashSession
    participant CA as CashAdjustment
    participant CE as CashExpense
    participant DB as Database

    Note over U,DB: 1. Setup and Session Start
    U->>S: Open operating day
    S->>DB: CREATE/GET cash_sessions
    DB-->>S: session_id
    Note over CS: status = DRAFT<br/>opening_balance (optional)
    S-->>U: Session initiated

    Note over U,DB: 2. Totals Capture (Incomes)
    U->>S: Import/Capture external report
    S->>DB: CREATE cash_adjustments<br/>type='EXTERNAL_IMPORT'
    DB-->>S: adjustment_id

    loop For each tender type
        alt Cash
            S->>DB: INSERT cash_adjustment_lines<br/>tender_type='CASH'
        else Card
            S->>DB: INSERT cash_adjustment_lines<br/>tender_type='CARD'<br/>card_terminal_id
        else Transfer
            S->>DB: INSERT cash_adjustment_lines<br/>tender_type='TRANSFER'<br/>bank_account_id
        end
    end
    S-->>U: Incomes recorded

    Note over U,DB: 3. Expense Recording (Outflows)
    U->>S: Record operational expense
    S->>DB: CREATE cash_expenses<br/>tender_type, amount, category
    Note over CE: Decreases closing_balance
    S-->>U: Expense recorded

    Note over U,DB: 4. Posting and Close
    U->>S: Request posting
    S->>DB: SELECT SUM(cash_adjustment_lines)<br/>WHERE session_id
    S->>DB: SELECT SUM(cash_expenses)<br/>WHERE session_id
    S->>S: Calculate closing_balance<br/>(opening + incomes - expenses)

    alt Valid balance
        S->>DB: UPDATE cash_adjustments<br/>SET posted_by, posted_at
        S->>DB: UPDATE cash_expenses<br/>SET posted_by, posted_at
        S->>DB: UPDATE cash_sessions<br/>SET status='POSTED'<br/>closing_balance
        S-->>U: ✓ Close successful
    else Variance or error
        S-->>U: ⚠ Requires correction
        U->>S: Create cash_adjustment<br/>type='CORRECTION'
        S->>DB: INSERT correction adjustment
        U->>S: Retry posting
    end

    Note over U,DB: 5. Reconciliation and Reports
    U->>S: Request report by register/date
    S->>DB: SELECT with aggregations<br/>GROUP BY tender_type, date
    DB-->>S: Totals per tender type
    S-->>U: Report generated
```

### 4.2) Flow Description

1. **Setup**: create registers per branch (`cash_registers`) for on-premise, delivery, and events; register terminals and bank accounts.
2. **Daily session**: at close time, ensure a `cash_sessions` exists per register and operating date.
3. **Totals capture**: for each tender in the external report, create a `cash_adjustment` with lines:
    - cash → `CASH` line;
    - card → `CARD` line referencing `card_terminal_id`;
    - transfer → `TRANSFER` line referencing `bank_account_id`.
4. **Expense capture** (when paid from on-premise/delivery register for convenience): create a `cash_expense` in the matching session with its `tender_type`, amount, and reference.
5. **Post**: mark adjustments and expenses as `POSTED`, set `posted_by/posted_at`, and recompute session `closing_balance` (opening + incomes − expenses).
6. **Future reconciliation** (not now): allow outflows/transfers between registers and variance reporting.

---

## 5) Permissions and audit

### 5.1) UML Class Diagram - Domain Model

```mermaid
classDiagram
    class Branch {
        +Long id
        +String name
        +String code
        +Boolean isActive
    }

    class OperatingUnit {
        +Long id
        +Long branchId
        +String name
        +String type
        +Boolean isActive
    }

    class CashRegister {
        +Long id
        +Long branchId
        +Long operatingUnitId
        +String code
        +String name
        +String type
        +Boolean isActive
        +JSON meta
    }

    class CashTerminal {
        +Long id
        +Long branchId
        +String name
        +String provider
        +String accountRef
        +String lastFour
        +Boolean isActive
        +JSON meta
    }

    class BankAccount {
        +Long id
        +Long branchId
        +String alias
        +String bankName
        +String accountNumberMasked
        +String clabeMasked
        +Boolean isActive
        +JSON meta
    }

    class CashSession {
        +Long id
        +Long cashRegisterId
        +Date operatingDate
        +String status
        +Decimal openingBalance
        +Decimal closingBalance
        +JSON meta
        +DateTime createdAt
        +DateTime updatedAt
        +calculateClosingBalance()
        +post(User user)
    }

    class CashAdjustment {
        +Long id
        +Long cashSessionId
        +String sourceSystem
        +String type
        +String direction
        +String notes
        +Long postedBy
        +DateTime postedAt
        +JSON meta
        +DateTime createdAt
        +DateTime updatedAt
        +post(User user)
        +getTotalAmount()
    }

    class CashAdjustmentLine {
        +Long id
        +Long cashAdjustmentId
        +String tenderType
        +Decimal amount
        +String currency
        +Long cardTerminalId
        +Long bankAccountId
        +String reference
        +JSON meta
        +DateTime createdAt
    }

    class CashExpense {
        +Long id
        +Long cashSessionId
        +String tenderType
        +Decimal amount
        +String category
        +String vendor
        +String reference
        +String notes
        +Long cardTerminalId
        +Long bankAccountId
        +DateTime incurredAt
        +Long createdBy
        +Long postedBy
        +DateTime postedAt
        +JSON meta
        +DateTime createdAt
        +DateTime updatedAt
        +post(User user)
    }

    class User {
        +Long id
        +String name
        +String email
    }

    Branch "1" --> "0..*" CashRegister : has
    Branch "1" --> "0..*" CashTerminal : owns
    Branch "1" --> "0..*" BankAccount : manages
    Branch "1" --> "0..*" OperatingUnit : contains

    OperatingUnit "0..1" --> "0..*" CashRegister : associates (events)

    CashRegister "1" --> "0..*" CashSession : generates

    CashSession "1" --> "0..*" CashAdjustment : records
    CashSession "1" --> "0..*" CashExpense : records

    CashAdjustment "1" --> "1..*" CashAdjustmentLine : details

    CashAdjustmentLine "0..*" --> "0..1" CashTerminal : uses (CARD)
    CashAdjustmentLine "0..*" --> "0..1" BankAccount : receives (TRANSFER)

    CashExpense "0..*" --> "0..1" CashTerminal : uses (CARD)
    CashExpense "0..*" --> "0..1" BankAccount : origin (TRANSFER)

    User "1" --> "0..*" CashAdjustment : records
    User "1" --> "0..*" CashExpense : creates

    note for CashRegister "type: ON_PREMISE | DELIVERY | EVENT"
    note for CashSession "status: DRAFT | POSTED\nUnique: (cash_register_id, operating_date)"
    note for CashAdjustment "type: EXTERNAL_IMPORT | CORRECTION\ndirection: INFLOW | OUTFLOW"
    note for CashAdjustmentLine "tender_type: CASH | CARD | TRANSFER"
    note for CashExpense "tender_type: CASH | CARD | TRANSFER"
```

### 5.2) Access Control

-   Suggested new permissions: `cash-registers.manage`, `cash-terminals.manage`, `cash-adjustments.create`, `cash-adjustments.post`, `cash-expenses.create`, `cash-expenses.post`.
-   Reuse `OperatingUnitUser` to scope access to registers tied to a given branch/unit.
-   Baseline audit: `created_by`, `posted_by`, `meta.reference` (external batch/folio), and timestamps.

---

## 6) Out of scope and next steps

-   No ticket-level sales or line items; only daily totals per tender.
-   Physical cash counts or partial till drops are not modeled yet.
-   Next: design Laravel endpoints/services and React screens for manual close capture, plus daily register/tender reports.
