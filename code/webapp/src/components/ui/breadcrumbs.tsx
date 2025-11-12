import { ChevronRight, Home } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbsProps {
  className?: string;
  items?: BreadcrumbItem[];
}

/**
 * Breadcrumbs component - Shows navigation trail
 *
 * @example
 * ```tsx
 * // Auto-generated from route
 * <Breadcrumbs />
 *
 * // Custom items
 * <Breadcrumbs items={[
 *   { label: 'Inventario', path: '/inventory' },
 *   { label: 'Productos', path: '/inventory/items' }
 * ]} />
 * ```
 */
export function Breadcrumbs({ className, items }: BreadcrumbsProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Auto-generate breadcrumbs from current path if not provided
  const breadcrumbItems = items || generateBreadcrumbs(currentPath);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-2 text-sm', className)}>
      {/* Home icon always first */}
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={item.path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />

            {isLast ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Generate breadcrumbs from current path
 */
function generateBreadcrumbs(path: string): BreadcrumbItem[] {
  // Route label mapping
  const routeLabels: Record<string, string> = {
    // Main routes
    '/productos': 'Productos',
    '/ordenes': 'Órdenes',
    '/clientes': 'Clientes',
    '/reportes': 'Reportes',
    '/configuracion': 'Configuración',

    // Inventory routes
    '/inventory': 'Inventario',
    '/inventory/locations': 'Ubicaciones',
    '/inventory/items': 'Items',
    '/inventory/item-variants': 'Variantes',
    '/inventory/stock-movements': 'Movimientos de Stock',

    // Units of Measure
    '/inventory/units-of-measure': 'Unidades de Medida',
  };

  // Skip home page
  if (path === '/') {
    return [];
  }

  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = routeLabels[currentPath] || formatSegment(segment);

    breadcrumbs.push({
      label,
      path: currentPath,
    });
  });

  return breadcrumbs;
}

/**
 * Format a path segment into a readable label
 */
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
