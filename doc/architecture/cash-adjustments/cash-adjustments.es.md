# 💵 Ajustes de Caja Diarios — Propuesta

**Alcance**
Registrar al cierre del día los totales de venta que entrega el software externo, dividiendo por caja (local, envíos a domicilio, eventos) y marcando el medio de cobro (efectivo, TC con terminal, transferencia con cuenta). Solo cubrimos **ajustes de ingreso** diarios; el alta de ventas ticket a ticket queda fuera de esta iteración.

---

## 1) Estado actual (DB y docs)

-   Tablas existentes orientadas a inventario: `branches`, `operating_units`, `inventory_locations`, `items`, `item_variants`, `stock*`, `media*`, usuarios y permisos (Spatie).
-   Sin tablas de **venta**, **cajas**, **terminales** ni **cuentas bancarias**. El único rastro de ventas es metadata opcional en `stock_movements` y campos de precio en `stock_movement_lines`, por lo que no hay soporte para caja o conciliación.
-   Estructura multi-sucursal y por unidad operativa (`operating_units`) ya disponible y sirve como ancla para relacionar las cajas con tiendas y eventos.

---

## 2) Objetivos del módulo

-   Registrar el ingreso diario por caja a partir de totales externos (no granular por ticket).
-   Etiquetar cada ingreso por **medio de pago**: efectivo, tarjeta (terminal usada) o transferencia (cuenta destino).
-   Permitir varias cajas por sucursal: local, delivery y una asociada a eventos especiales.
-   Asociar cajas con `branch` y, cuando aplique, con `operating_unit` de tipo evento.
-   Trazabilidad: usuario que captura, fuente externa, fecha operativa y auditoría básica.

---

## 3) Modelo de datos propuesto

> Las tablas nuevas se ubicarían en el dominio financiero, enlazando con `branches` y opcionalmente `operating_units`.

### 3.1) Diagrama Entidad-Relación (ER)

```mermaid
erDiagram
    BRANCHES ||--o{ CASH_REGISTERS : "tiene"
    BRANCHES ||--o{ CASH_TERMINALS : "posee"
    BRANCHES ||--o{ BANK_ACCOUNTS : "administra"

    OPERATING_UNITS ||--o| CASH_REGISTERS : "asocia (eventos)"

    CASH_REGISTERS ||--o{ CASH_SESSIONS : "genera"
    CASH_SESSIONS ||--o{ CASH_ADJUSTMENTS : "registra"
    CASH_SESSIONS ||--o{ CASH_EXPENSES : "registra"

    CASH_ADJUSTMENTS ||--o{ CASH_ADJUSTMENT_LINES : "detalla"

    CASH_TERMINALS ||--o{ CASH_ADJUSTMENT_LINES : "usa"
    CASH_TERMINALS ||--o{ CASH_EXPENSES : "usa"

    BANK_ACCOUNTS ||--o{ CASH_ADJUSTMENT_LINES : "recibe"
    BANK_ACCOUNTS ||--o{ CASH_EXPENSES : "origen"

    USERS ||--o{ CASH_ADJUSTMENTS : "registra"
    USERS ||--o{ CASH_EXPENSES : "crea"

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

### 3.2) Descripción de Tablas

**`cash_registers`** — catálogo de cajas por sucursal

-   `branch_id` (FK), `operating_unit_id` (FK nullable para eventos), `code`, `name`.
-   `type`: `ON_PREMISE` (local), `DELIVERY`, `EVENT`.
-   Flags: `is_active`, `meta` (para alias en software externo).

**`cash_terminals`** — terminales de tarjeta por sucursal

-   `branch_id` (FK), `name` (alias operativo), `provider`, `account_ref` (ID de cuenta/afiliación), `last_four`, `is_active`, `meta`.

**`bank_accounts`** — cuentas destino para transferencias

-   `branch_id` (FK), `alias`, `bank_name`, `account_number_masked`, `clabe_masked`, `is_active`, `meta`.

**`cash_sessions`** — día operativo por caja

-   `cash_register_id` (FK), `operating_date`, `status` (`DRAFT|POSTED`), `opening_balance` (nullable), `closing_balance` (se calcula con ajustes), `meta` (e.g. folio externo).
-   Unicidad por (`cash_register_id`, `operating_date`) para evitar duplicados diarios.

**`cash_adjustments`** — encabezado de ajuste de ingreso/egreso

-   `cash_session_id` (FK), `source_system` (texto corto), `type` (`EXTERNAL_IMPORT|CORRECTION`), `direction` (`INFLOW|OUTFLOW`), `notes`, `posted_by`, `posted_at`, `meta`.
-   Representa el pase de totales desde el otro sistema o correcciones; `OUTFLOW` se reserva para egresos que se modelen como ajuste general (p. ej. retiro a bóveda).

**`cash_adjustment_lines`** — detalle por medio de pago

-   `cash_adjustment_id` (FK), `tender_type` (`CASH|CARD|TRANSFER`), `amount`, `currency` (`MXN` por defecto), `card_terminal_id` (FK nullable), `bank_account_id` (FK nullable), `reference` (ID de corte externo), `meta` (ej. propinas, cargos).
-   Índice por `tender_type` y `operating_date` (via `cash_session`) para reportes diarios.

**`cash_expenses`** — egresos pagados desde caja/delivery

-   `cash_session_id` (FK), `tender_type` (`CASH|CARD|TRANSFER`), `amount`, `category`, `vendor`, `reference` (folio/nota), `notes`, `card_terminal_id` (nullable), `bank_account_id` (nullable), `incurred_at`, `created_by`, `posted_by`, `posted_at`, `meta`.
-   Decrementan el `closing_balance` de la sesión. Sirven para “salidas operativas” tomadas de la caja/terminal más conveniente.

---

## 4) Flujo operativo (cierre diario)

### 4.1) Diagrama de Secuencia - Cierre Diario

```mermaid
sequenceDiagram
    participant U as Usuario/Cajero
    participant S as Sistema
    participant CS as CashSession
    participant CA as CashAdjustment
    participant CE as CashExpense
    participant DB as Base de Datos

    Note over U,DB: 1. Setup e Inicio de Sesión
    U->>S: Abrir día operativo
    S->>DB: CREATE/GET cash_sessions
    DB-->>S: session_id
    Note over CS: status = DRAFT<br/>opening_balance (opcional)
    S-->>U: Sesión iniciada

    Note over U,DB: 2. Captura de Totales (Ingresos)
    U->>S: Importar/Capturar reporte externo
    S->>DB: CREATE cash_adjustments<br/>type='EXTERNAL_IMPORT'
    DB-->>S: adjustment_id

    loop Por cada medio de pago
        alt Efectivo
            S->>DB: INSERT cash_adjustment_lines<br/>tender_type='CASH'
        else Tarjeta
            S->>DB: INSERT cash_adjustment_lines<br/>tender_type='CARD'<br/>card_terminal_id
        else Transferencia
            S->>DB: INSERT cash_adjustment_lines<br/>tender_type='TRANSFER'<br/>bank_account_id
        end
    end
    S-->>U: Ingresos registrados

    Note over U,DB: 3. Registro de Gastos (Egresos)
    U->>S: Registrar gasto operativo
    S->>DB: CREATE cash_expenses<br/>tender_type, amount, category
    Note over CE: Decrementan closing_balance
    S-->>U: Egreso registrado

    Note over U,DB: 4. Publicación y Cierre
    U->>S: Solicitar publicación
    S->>DB: SELECT SUM(cash_adjustment_lines)<br/>WHERE session_id
    S->>DB: SELECT SUM(cash_expenses)<br/>WHERE session_id
    S->>S: Calcular closing_balance<br/>(opening + ingresos - egresos)

    alt Balance válido
        S->>DB: UPDATE cash_adjustments<br/>SET posted_by, posted_at
        S->>DB: UPDATE cash_expenses<br/>SET posted_by, posted_at
        S->>DB: UPDATE cash_sessions<br/>SET status='POSTED'<br/>closing_balance
        S-->>U: ✓ Cierre exitoso
    else Descuadre o error
        S-->>U: ⚠ Requiere corrección
        U->>S: Crear cash_adjustment<br/>type='CORRECTION'
        S->>DB: INSERT ajuste corrección
        U->>S: Reintentar publicación
    end

    Note over U,DB: 5. Conciliación y Reportes
    U->>S: Solicitar reporte por caja/fecha
    S->>DB: SELECT con agregaciones<br/>GROUP BY tender_type, date
    DB-->>S: Totales por medio de pago
    S-->>U: Reporte generado
```

### 4.2) Descripción del Flujo

1. **Setup**: crear cajas por sucursal (`cash_registers`) para local, delivery y eventos; registrar terminales y cuentas.
2. **Sesión diaria**: al iniciar el cierre, se crea/asegura un `cash_sessions` por caja y fecha operativa.
3. **Captura de totales**: por cada medio de pago del reporte externo se registra un `cash_adjustment` con líneas:
    - efectivo → línea `CASH`;
    - tarjeta → `CARD` con `card_terminal_id`;
    - transferencia → `TRANSFER` con `bank_account_id`.
4. **Registro de gastos** (cuando se pagan desde caja/delivery por comodidad): crear `cash_expense` en la sesión correspondiente con su `tender_type`, monto y referencia.
5. **Publicación**: al guardar, los ajustes y gastos se marcan `POSTED`, se fijan `posted_by/posted_at` y se recalcula `closing_balance` de la sesión (opening + ingresos − egresos).
6. **Conciliación futura** (no implementada ahora): permitir egresos/transferencias entre cajas y reporte de diferencias.

---

## 5) Permisos y auditoría

### 5.1) Diagrama de Clases UML - Modelo de Dominio

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

    Branch "1" --> "0..*" CashRegister : tiene
    Branch "1" --> "0..*" CashTerminal : posee
    Branch "1" --> "0..*" BankAccount : administra
    Branch "1" --> "0..*" OperatingUnit : contiene

    OperatingUnit "0..1" --> "0..*" CashRegister : asocia (eventos)

    CashRegister "1" --> "0..*" CashSession : genera

    CashSession "1" --> "0..*" CashAdjustment : registra
    CashSession "1" --> "0..*" CashExpense : registra

    CashAdjustment "1" --> "1..*" CashAdjustmentLine : detalla

    CashAdjustmentLine "0..*" --> "0..1" CashTerminal : usa (CARD)
    CashAdjustmentLine "0..*" --> "0..1" BankAccount : recibe (TRANSFER)

    CashExpense "0..*" --> "0..1" CashTerminal : usa (CARD)
    CashExpense "0..*" --> "0..1" BankAccount : origen (TRANSFER)

    User "1" --> "0..*" CashAdjustment : registra
    User "1" --> "0..*" CashExpense : crea

    note for CashRegister "type: ON_PREMISE | DELIVERY | EVENT"
    note for CashSession "status: DRAFT | POSTED\nUnique: (cash_register_id, operating_date)"
    note for CashAdjustment "type: EXTERNAL_IMPORT | CORRECTION\ndirection: INFLOW | OUTFLOW"
    note for CashAdjustmentLine "tender_type: CASH | CARD | TRANSFER"
    note for CashExpense "tender_type: CASH | CARD | TRANSFER"
```

### 5.2) Control de Acceso

-   Nuevos permisos sugeridos: `cash-registers.manage`, `cash-terminals.manage`, `cash-adjustments.create`, `cash-adjustments.post`, `cash-expenses.create`, `cash-expenses.post`.
-   Reutilizar `OperatingUnitUser` para limitar acceso a cajas ligadas a una sucursal/unidad.
-   Auditoría mínima: `created_by`, `posted_by`, `meta.reference` (folio del sistema externo) y timestamps.

---

## 6) Fuera de alcance y siguientes pasos

-   No se captura detalle de ticket ni líneas de venta; solo totales por medio de pago.
-   No se modela el conteo físico de efectivo ni arqueos parciales.
-   Próximo paso: diseñar endpoints/servicios (Laravel) y pantallas (React) para captura manual del cierre, más reportes diarios por caja y medio de pago.
