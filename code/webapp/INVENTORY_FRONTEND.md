# Inventory Frontend Module

## 📋 Descripción

Módulo frontend moderno para gestión de inventario construido con:
- **React 19** + **TypeScript**
- **TanStack Router** (file-based routing)
- **TanStack Query** (data fetching & caching)
- **Tailwind CSS** (styling)
- **Slide Panels** estilo GitHub Projects

## 🎯 Características Implementadas

### Componentes Reutilizables

1. **SlidePanel** (`src/components/ui/slide-panel.tsx`)
   - Panel lateral deslizable con animaciones
   - Soporte para diferentes tamaños (sm, md, lg, xl, full)
   - Posición configurable (left/right)
   - Subcomponentes: Header, Body, Footer
   - Cerrar con ESC o backdrop click

2. **DataGrid** (`src/components/ui/data-grid.tsx`)
   - Grid de datos con paginación
   - Columnas configurables con renderizado personalizado
   - Selección de filas
   - Estados de carga y vacío
   - Responsive

3. **FormFields** (`src/components/ui/form-fields.tsx`)
   - FormField wrapper con label, error, hint
   - Select, Textarea, Checkbox personalizados
   - Validación visual de errores

### Módulos Implementados

#### 1. Inventory Locations ✅ COMPLETO

##### Página Principal
**Archivo**: `src/pages/inventory/locations.tsx`

**Funcionalidades**:
- ✅ Listado en grid de locations
- ✅ Paginación
- ✅ Click en fila abre slide panel de detalles
- ✅ Botón "New Location" abre formulario en slide panel
- ✅ Editar desde panel de detalles
- ✅ Eliminar con confirmación
- ✅ Indicadores visuales (primary, active, type)

##### Componentes Específicos

1. **LocationForm** (`src/components/inventory/location-form.tsx`)
   - Formulario create/update
   - Validación de campos
   - Select de Operating Units (API integrada)
   - Manejo de errores del backend

2. **LocationDetails** (`src/components/inventory/location-details.tsx`)
   - Vista detallada de location
   - Stock summary (variantes, valor total)
   - Información completa
   - Acciones: Edit, Delete

#### 2. Items ✅ COMPLETO

##### Página Principal
**Archivo**: `src/pages/inventory/items.tsx`

**Funcionalidades**:
- ✅ Grid con 6 columnas (SKU, Name, Type, Tracked, Perishable, Status)
- ✅ SKU inmutable después de creación (uppercase automático)
- ✅ Sistema de color coding por tipo (INSUMO=azul, PRODUCTO=verde, ACTIVO=morado)
- ✅ Contador de variantes integrado con API
- ✅ Indicadores visuales para propiedades
- ✅ Formulario con validación: SKU min 2 caracteres, nombre min 3 caracteres
- ✅ Click en fila → Panel de detalles
- ✅ Botón "New" → Panel de formulario
- ✅ Editar/Eliminar desde panel de detalles
- ✅ Ver Variantes (navegación a variantes del item)

##### Componentes Específicos

1. **ItemForm** (`src/components/inventory/item-form.tsx`)
   - Formulario create/update
   - SKU inmutable en edición, uppercase automático
   - Type select con descripciones
   - 3 checkboxes (Tracked, Perishable, Active)
   - Validación client-side + server errors

2. **ItemDetails** (`src/components/inventory/item-details.tsx`)
   - Vista detallada con SKU badge
   - Contador de variantes (API)
   - Type info card con color coding
   - Properties con iconos visuales
   - Acciones: Edit, Delete, View Variants

**📄 Documentación Completa**: `ITEMS_MODULE.md`

#### 3. Item Variants ✅ COMPLETO

##### Página Principal
**Archivo**: `src/pages/inventory/item-variants.tsx`

**Funcionalidades**:
- ✅ Grid con 6 columnas (Code, Variant Name, UoM, Stock Levels, Cost, Status)
- ✅ Code inmutable con auto-uppercase
- ✅ Integración con Items API para select dropdown
- ✅ Integración con Units of Measure API para UoM select
- ✅ Current stock display (on hand, reserved, available)
- ✅ Min/Max stock levels configuration
- ✅ Cost tracking (last + average)
- ✅ Click en fila → Panel de detalles
- ✅ Botón "New Variant" → Panel de formulario
- ✅ Editar/Eliminar desde panel de detalles

##### Componentes Específicos

1. **VariantForm** (`src/components/inventory/variant-form.tsx`)
   - Formulario create/update
   - Item select (disabled en edición)
   - Code input con uppercase automático
   - UoM select con type info
   - Min/Max stock inputs con validación
   - Cost input (last unit cost)
   - Active checkbox
   - Validación client-side + server errors

2. **VariantDetails** (`src/components/inventory/variant-details.tsx`)
   - Vista detallada con code badge
   - Parent item info con SKU
   - Current stock summary (API call)
   - UoM complete details (name, symbol, type, precision)
   - Stock levels display (min/max)
   - Cost information (last + avg)
   - Timestamps
   - Acciones: Edit, Delete

**📄 Documentación Completa**: `ITEM_VARIANTS_MODULE.md`

#### 4. Stock Movement Forms ✅ COMPLETO

##### Componentes

1. **OpeningBalanceForm** (`src/components/inventory/opening-balance-form.tsx`)
   - Registro de inventario inicial
   - Location + Variant selection
   - Quantity + Unit Cost inputs
   - Auto-fill UoM from variant
   - Real-time Total Cost calculation
   - Variant info card display
   - Notes field opcional

2. **StockOutForm** (`src/components/inventory/stock-out-form.tsx`)
   - Salida de inventario (venta/consumo)
   - Current stock display en tiempo real
   - Stock availability validation
   - Low stock warnings (yellow)
   - Insufficient stock blocking (red)
   - Reason selection (SALE/CONSUMPTION)
   - Sale price (condicional para SALE)
   - Real-time Profit Calculation
   - Profit analysis card (revenue, cost, margin)
   - Visual feedback (green=profit, red=loss)

**📄 Documentación Completa**: `STOCK_MOVEMENT_FORMS.md`

### Componentes UI Globales

#### Toast Notifications System ✅ COMPLETO

**Archivos**: `src/components/ui/toast.tsx`, `src/components/ui/toast-provider.tsx`

**Funcionalidades**:
- ✅ 4 variantes (success, error, warning, info)
- ✅ Auto-dismiss configurable (5s default)
- ✅ Botón de cerrar manual
- ✅ Animaciones suaves (slide-in + fade)
- ✅ Iconos contextuales por variante
- ✅ Provider global con Context API
- ✅ Hook useToast() para acceso fácil
- ✅ Métodos helper: showSuccess, showError, showWarning, showInfo
- ✅ Queue management (múltiples toasts apilados)
- ✅ TypeScript completo
- ✅ Accesibilidad (ARIA labels, roles)

**Uso**:
```typescript
const { showSuccess, showError } = useToast()

// Success toast
showSuccess('Item created successfully!', 'Success')

// Error toast  
showError('Failed to delete item', 'Error')
```

**📄 Documentación Completa**: `TOAST_NOTIFICATIONS_SYSTEM.md`  
**📄 Ejemplos de Integración**: `TOAST_INTEGRATION_EXAMPLES.md`

### Servicios API

**Archivo**: `src/services/inventory-api.ts`

APIs implementadas:
- `inventoryLocationApi` - CRUD completo
- `itemApi` - CRUD completo  
- `itemVariantApi` - CRUD completo
- `stockApi` - List, byLocation, byVariant
- `stockMovementApi` - openingBalance, stockOut

### Tipos TypeScript

**Archivo**: `src/types/inventory.ts`

Interfaces completas para:
- InventoryLocation
- Item
- ItemVariant
- Stock
- StockMovement
- StockMovementLine
- UnitOfMeasure
- Respuestas API (Paginated, Entity, Error)

## 🚀 Cómo Ejecutar

### 1. Variables de Entorno

Crear archivo `.env` en `/app/code/webapp/`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

### 2. Instalar Dependencias

```bash
cd /app/code/webapp
npm install
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: `http://localhost:5173`

## 📁 Estructura de Archivos

```
src/
├── components/
│   ├── ui/
│   │   ├── slide-panel.tsx      # Panel deslizable
│   │   ├── data-grid.tsx        # Grid de datos
│   │   ├── form-fields.tsx      # Campos de formulario
│   │   ├── input.tsx            # Input mejorado
│   │   ├── button.tsx           # Botón reutilizable
│   │   ├── card.tsx             # Card component
│   │   ├── page-container.tsx   # Container de página
│   │   └── page-header.tsx      # Header de página
│   │
│   └── inventory/
│       ├── location-form.tsx    # Formulario de locations
│       └── location-details.tsx # Detalles de location
│
├── pages/
│   └── inventory/
│       └── locations.tsx        # Página principal
│
├── services/
│   └── inventory-api.ts         # Cliente API
│
├── types/
│   └── inventory.ts             # Tipos TypeScript
│
└── lib/
    └── utils.ts                 # Utilidades (cn, etc)
```

## 🎨 Flujo de Usuario

### Ver Locations
1. Usuario ve grid con todas las locations
2. Cada fila muestra: nombre, tipo, prioridad, primary, status
3. Click en fila → Abre slide panel con detalles

### Crear Location
1. Click en "New Location"
2. Slide panel aparece desde la derecha
3. Formulario con validación
4. Submit → Cierra panel y refresca grid

### Editar Location
1. Desde panel de detalles, click "Edit"
2. Panel de detalles se cierra
3. Panel de formulario se abre con datos precargados
4. Submit → Actualiza y refresca

### Eliminar Location
1. Desde panel de detalles, click "Delete"
2. Confirmación
3. Elimina y cierra panel

## 🔄 Próximos Pasos Sugeridos

### Páginas Pendientes
- [ ] Items (CRUD con slide panels)
- [ ] Item Variants (CRUD con slide panels)
- [ ] Stock View (por location/variant)
- [ ] Opening Balance (formulario)
- [ ] Stock Out (formulario con profit calculation)

### Mejoras Sugeridas
- [ ] Filtros en DataGrid
- [ ] Búsqueda
- [ ] Sorting en columnas
- [ ] Export to CSV/Excel
- [ ] Bulk actions
- [ ] Toast notifications
- [ ] Loading skeletons
- [ ] Error boundaries

## 💡 Patrones de Diseño Utilizados

1. **Composition Pattern** - SlidePanel con subcomponentes
2. **Generic Components** - DataGrid<T> con tipos genéricos
3. **Single Responsibility** - Cada componente una función
4. **DRY** - FormFields reutilizables
5. **Type Safety** - Todo tipado con TypeScript

## 🎯 Beneficios del Approach

✅ **Reutilizabilidad**: Componentes base sirven para todo el módulo
✅ **Consistencia**: Mismo UX en toda la aplicación
✅ **Mantenibilidad**: Código organizado y tipado
✅ **Performance**: React Query maneja cache automáticamente
✅ **UX Moderna**: Slide panels = menos navegación, más productividad
✅ **Escalabilidad**: Fácil agregar nuevas entidades
