# Implementación de Ajustes de Caja - Frontend

## Resumen

Se ha implementado la funcionalidad completa para registrar ajustes de caja con justificación, permitiendo registrar ingresos del sistema externo de pedidos en el nuevo sistema.

## Componentes Creados

### 1. CreateAdjustmentDialog

**Ubicación:** `/app/code/webapp/src/components/cash/create-adjustment-dialog.tsx`

**Descripción:** Diálogo deslizable (slide panel) para registrar ajustes de caja con soporte para múltiples líneas de pago.

**Características:**

- Selección de sesión de caja abierta (solo sesiones en estado DRAFT)
- Dos tipos de ajuste:
    - **Importación Externa:** Para registrar ingresos del sistema de pedidos actual
    - **Corrección Manual:** Para ajustes manuales (requiere justificación obligatoria)
- Dirección del flujo: Entrada (INFLOW) o Salida (OUTFLOW)
- Campo de sistema de origen (opcional para importaciones)
- Campo de notas/justificación (obligatorio para correcciones)
- Soporte para múltiples líneas de pago:
    - Efectivo (CASH)
    - Tarjeta (CARD) - requiere selección de terminal
    - Transferencia (TRANSFER) - requiere selección de cuenta bancaria
- Cálculo automático del total
- Validación completa de formulario
- Notificaciones toast automáticas

**Props:**

```typescript
interface CreateAdjustmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    cashSessionId?: number; // Opcional: pre-seleccionar sesión
}
```

## Tipos Actualizados

### Correcciones en `/app/code/webapp/src/types/cash.ts`

1. **AdjustmentType enum:**
    - `EXTERNAL_IMPORT` (antes era SALES)
    - `CORRECTION`

2. **CashAdjustment interface:**
    - Campo `source_system` (antes era `source`)
    - Eliminados campos obsoletos: `created_by`, `external_id`, `reference`
    - Actualizada relación: `posted_by_user`

3. **CashAdjustmentFormData:**
    - Campo `source_system` (opcional)
    - Eliminados campos obsoletos

## Integración en Dashboard

**Ubicación:** `/app/code/webapp/src/pages/Dashboard.tsx`

**Cambios realizados:**

1. Importado `CreateAdjustmentDialog` y `SessionStatus`
2. Agregado estado `isAdjustmentDialogOpen`
3. Nuevo botón "Registrar Ajuste" en sección de Acciones Rápidas:
    - Color azul para diferenciarlo de "Abrir Sesión"
    - Se deshabilita cuando no hay sesiones abiertas
4. Agregado diálogo al final del componente
5. Handler `handleAdjustmentSuccess` para post-creación

## Backend Disponible

El backend ya cuenta con toda la funcionalidad necesaria:

### Endpoints:

- `POST /api/v1/cash-adjustments` - Crear ajuste
- `GET /api/v1/cash-adjustments` - Listar ajustes
- `GET /api/v1/cash-adjustments/{id}` - Ver detalle
- `POST /api/v1/cash-adjustments/{id}/post` - Finalizar ajuste
- `DELETE /api/v1/cash-adjustments/{id}` - Eliminar (solo borrador)

### Servicios:

- `CashAdjustmentService::createAdjustment()`
- `CashAdjustmentService::createFromExternalReport()`
- `CashAdjustmentService::createCorrection()`
- `CashAdjustmentService::postAdjustment()`

### Validaciones:

- Tipo: EXTERNAL_IMPORT o CORRECTION
- Dirección: INFLOW o OUTFLOW
- Al menos una línea requerida
- Tarjetas requieren terminal_id
- Transferencias requieren bank_account_id

## Hooks Disponibles

Ya existentes en `/app/code/webapp/src/services/cash-hooks.ts`:

```typescript
useCashAdjustments(filters?)    // Listar ajustes
useCashAdjustment(id)           // Obtener uno
useCreateCashAdjustment()       // Crear (con toast)
usePostCashAdjustment()         // Finalizar (con toast)
useDeleteCashAdjustment()       // Eliminar (con toast)
```

## Flujo de Uso

### Caso de Uso Principal: Registro de Ingresos del Sistema Externo

1. Usuario abre el Dashboard
2. Verifica que hay una sesión de caja abierta
3. Click en botón "Registrar Ajuste"
4. Completa el formulario:
    - Tipo: "Importación Externa"
    - Dirección: "Entrada"
    - Sistema de Origen: "POS" (o el nombre del sistema)
    - Notas: Descripción opcional del ingreso
    - Agrega líneas por tipo de pago:
        - Efectivo: $XXX
        - Tarjeta: $XXX (selecciona terminal Clip/MercadoPago)
        - Transferencia: $XXX (selecciona cuenta bancaria)
5. Verifica el total calculado
6. Click en "Registrar Ajuste"
7. Se crea el ajuste en estado DRAFT
8. Toast de confirmación
9. Se actualiza la lista de sesiones

### Caso de Uso Secundario: Corrección Manual

1. Mismo proceso pero seleccionando "Corrección Manual"
2. Campo "Justificación" es obligatorio
3. Debe explicar el motivo del ajuste

## Próximos Pasos

### Opcional - Mejoras Futuras:

1. **Página de lista de ajustes**
    - Filtros por sesión, tipo, dirección, estado
    - Búsqueda
    - Paginación

2. **Página de detalle de ajuste**
    - Ver todas las líneas
    - Botón para finalizar (POST)
    - Historial de cambios

3. **Integración en detalle de sesión**
    - Mostrar ajustes asociados
    - Botón rápido para crear ajuste

4. **Reportes**
    - Resumen de ajustes por período
    - Desglose por tipo de pago
    - Análisis de correcciones frecuentes

## Notas Técnicas

- Se utiliza `SessionStatus.DRAFT` en lugar de string literal 'DRAFT'
- Los componentes Select usan eventos HTML estándar (onChange con event)
- Se agregó Textarea de form-fields.tsx
- Validación en tiempo real de campos requeridos
- No se permite crear ajuste sin sesión abierta (botón deshabilitado)
- Los ajustes se crean en estado DRAFT y deben ser finalizados con POST

## Seguridad

- Todos los endpoints requieren autenticación (`auth:api`)
- Políticas de autorización verifican permisos:
    - `cash_adjustments.create`
    - `cash_adjustments.view`
    - `cash_adjustments.delete`
- Validación de acceso a sucursal
- No se pueden eliminar/modificar ajustes finalizados (POSTED)
