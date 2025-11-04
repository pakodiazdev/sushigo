# Routing and Pages Structure

## 📁 Architecture

The project follows an architecture where **each page exports its own route**, eliminating the need for separate configuration files.

### Pages (`src/pages/`)
Contains both logic/UI and route configuration. They are self-contained React components.

```
pages/
├── __root.tsx           # Application root layout
├── index.tsx            # Route "/" - Dashboard entry point
├── Dashboard.tsx        # Main page with statistics
├── Productos.tsx        # Route "/productos" - Product management
├── Ordenes.tsx          # Route "/ordenes" - Order management
├── Clientes.tsx         # Route "/clientes" - Customer management
├── Reportes.tsx         # Route "/reportes" - Reports and statistics
└── Configuracion.tsx    # Route "/configuracion" - System configuration
```

### Reusable Components (`src/components/ui/`)

- **PageContainer**: Wrapper with padding and max-width for all pages
- **PageHeader**: Reusable header with title, description, and actions

## 🔄 Workflow

### 1. Create a new page (everything in one file):

```tsx
// src/pages/MyPage.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

// Export route configuration
export const Route = createFileRoute('/my-page')({
    component: MyPagePage,
});

// Define page component
export function MyPagePage() {
    return (
        <PageContainer>
            <PageHeader
                title="My Page"
                description="Page description"
            >
                <Button>Action</Button>
            </PageHeader>

            {/* Page content */}
        </PageContainer>
    );
}
```

### 2. TanStack Router automatically generates:
- The `routeTree.gen.ts` file detecting all pages in `src/pages/`
- Typed navigation with autocomplete
- Types for all routes and parameters

## ✨ Advantages of this structure:

1. **Single File**: Everything related to a page is in one place
2. **Fewer Files**: No need to create separate route files
3. **Colocation**: Route and component are together, easy to find and maintain
4. **Reusable**: Components can be exported and used in other contexts
5. **Type-Safe**: TanStack Router generates types automatically
6. **DRY**: Components like `PageContainer` and `PageHeader` avoid duplication
7. **Auto-Discovery**: TanStack Router automatically detects all pages

## 🎯 Conventions:

- **Files**: PascalCase (e.g., `Productos.tsx`, `MyPage.tsx`)
- **Routes**: Defined with `createFileRoute('/route')` inside the file
- **Components**: `Page` suffix (e.g., `ProductosPage`)
- **Exports**:
  - `export const Route` for route configuration
  - `export function NamePage()` for the component
- **Imports**: Path aliases with `@/` for absolute imports

## 📝 Important Notes:

- The `__root.tsx` file must be in `src/pages/` and contains the main layout
- For the root route `/`, use `index.tsx` which imports and exports the Dashboard
- TanStack Router generates `routeTree.gen.ts` automatically when starting the dev server
- Routes are configured with the `createFileRoute()` function in each page
