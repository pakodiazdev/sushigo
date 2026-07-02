import {
    LayoutDashboard,
    Package,
    Users,
    ShoppingCart,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    X,
    Warehouse,
    ChevronDown,
    ChevronUp,
    DollarSign,
    UserCog,
    CalendarCheck,
    ClipboardList,
    type LucideIcon
} from 'lucide-react';
import { useSidebar } from '@/contexts/sidebar-context';
import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { BranchSwitcher } from '@/components/auth';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useMenuAccess, type AccessResult } from '@/hooks/use-menu-access';
import { useAuthStore } from '@/stores/auth.store';
import { usePendingRequestsCount } from '@/services/employee-request-hooks';

interface SubMenuItem {
    label: string;
    path: string;
    /** When set, the sub-item is hidden unless the user has this permission. */
    requiredPermission?: string;
}

interface MenuItem {
    icon: LucideIcon;
    label: string;
    path?: string;
    subItems?: SubMenuItem[];
    // Access control
    requiredPermission?: string;
    requiredRole?: 'admin' | 'super-admin';
    /** 'hidden' = remove from DOM (default). 'disabled' = greyed-out. */
    accessMode?: 'hidden' | 'disabled';
    /** Optional badge count shown next to the label. */
    badge?: number;
}

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Productos', path: '/productos' },
    { icon: ShoppingCart, label: 'Órdenes', path: '/ordenes' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    {
        icon: UserCog,
        label: 'Empleados',
        path: '/employees',
        requiredPermission: 'employees.view',
        accessMode: 'hidden',
    },
    {
        icon: CalendarCheck,
        label: 'Asistencia',
        requiredPermission: 'employees.view',
        accessMode: 'hidden',
        subItems: [
            { label: 'Asistencia', path: '/attendance' },
            { label: 'Reporte del Día', path: '/attendance/reports/today', requiredPermission: 'reports.today' },
            { label: 'Cierre de Nómina', path: '/attendance/payroll/close', requiredPermission: 'payroll.preview' },
            { label: 'Festivos', path: '/attendance/config/holidays', requiredPermission: 'holidays.manage' },
        ]
    },
    {
        icon: ClipboardList,
        label: 'Solicitudes',
        path: '/solicitudes',
        requiredPermission: 'employee-requests.view',
        accessMode: 'hidden',
    },
    {
        icon: Warehouse,
        label: 'Inventario',
        requiredPermission: 'items.view',
        accessMode: 'hidden',
        subItems: [
            { label: '+ Nuevo Producto', path: '/inventory/items?wizard=true' },
            { label: 'Ubicaciones', path: '/inventory/locations' },
            { label: 'Items', path: '/inventory/items' },
            { label: 'Variantes', path: '/inventory/item-variants' },
        ]
    },
    {
        icon: DollarSign,
        label: 'Caja',
        requiredPermission: 'cash_registers.view',
        accessMode: 'hidden',
        subItems: [
            { label: 'Cajas Registradoras', path: '/cash/registers' },
            { label: 'Terminales', path: '/cash/terminals' },
            { label: 'Cuentas Bancarias', path: '/cash/bank-accounts' },
        ]
    },
    {
        icon: BarChart3,
        label: 'Stock Dashboard',
        path: '/stock-dashboard',
        requiredPermission: 'stock.view',
        accessMode: 'hidden',
    },
    {
        icon: Settings,
        label: 'Configuración',
        path: '/configuracion',
        requiredRole: 'super-admin',
        accessMode: 'hidden',
    },
];

export default function Sidebar() {
    const { isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebar();
    const router = useRouterState();
    const currentPath = router.location.pathname;
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const { resolveAccess } = useMenuAccess();
    const { can } = useAuthStore();
    const canApprove = can('employee-requests.approve');
    const { data: pendingCount = 0 } = usePendingRequestsCount({ enabled: canApprove });

    const menuItemsResolved = menuItems.map((item) =>
        item.path === '/solicitudes' && canApprove && pendingCount > 0
            ? { ...item, badge: pendingCount }
            : item,
    );

    const toggleSubmenu = (label: string) => {
        setExpandedMenus(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const isSubmenuExpanded = (label: string) => expandedMenus.includes(label);

    const isMenuItemActive = (item: MenuItem) => {
        if (item.path) {
            return currentPath === item.path;
        }
        if (item.subItems) {
            return item.subItems.some(subItem => currentPath === subItem.path);
        }
        return false;
    };

    const renderMenuItem = (item: MenuItem, access: AccessResult) => {
        const Icon = item.icon;
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = isSubmenuExpanded(item.label);
        const isActive = isMenuItemActive(item);

        const baseItemClass = cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "transition-colors duration-200 font-medium",
            isCollapsed && "justify-center",
        );

        if (access === 'disabled') {
            return (
                <li key={item.label}>
                    <span
                        className={cn(baseItemClass, "opacity-50 cursor-not-allowed text-muted-foreground")}
                        title="Sin acceso"
                        aria-disabled="true"
                    >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                    </span>
                </li>
            );
        }

        return (
            <li key={item.label}>
                {item.path ? (
                    <Link
                        to={item.path}
                        onClick={closeMobileSidebar}
                        className={cn(
                            baseItemClass,
                            isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!isCollapsed && (
                            <>
                                <span className="flex-1">{item.label}</span>
                                {item.badge != null && item.badge > 0 && (
                                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-medium bg-destructive text-destructive-foreground">
                                        {item.badge}
                                    </span>
                                )}
                            </>
                        )}
                    </Link>
                ) : (
                    <>
                        <button
                            onClick={() => !isCollapsed && toggleSubmenu(item.label)}
                            className={cn(
                                "w-full",
                                baseItemClass,
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {!isCollapsed && (
                                <>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {hasSubItems && (
                                        isExpanded
                                            ? <ChevronUp className="h-4 w-4" />
                                            : <ChevronDown className="h-4 w-4" />
                                    )}
                                </>
                            )}
                        </button>

                        {hasSubItems && !isCollapsed && isExpanded && (
                            <ul className="mt-1 ml-8 space-y-1">
                                {item.subItems!.filter((subItem) =>
                                    !subItem.requiredPermission || can(subItem.requiredPermission)
                                ).map((subItem) => {
                                    const isSubActive = currentPath === subItem.path;
                                    return (
                                        <li key={subItem.path}>
                                            <Link
                                                to={subItem.path}
                                                onClick={closeMobileSidebar}
                                                className={cn(
                                                    "block px-3 py-2 rounded-lg text-sm",
                                                    "transition-colors duration-200",
                                                    isSubActive
                                                        ? "bg-primary text-primary-foreground font-medium"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                )}
                                            >
                                                {subItem.label}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </li>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={closeMobileSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-30",
                    "bg-background border-r shadow-lg",
                    "transition-all duration-300 ease-in-out",
                    "w-64",
                    isCollapsed ? "lg:w-20" : "lg:w-64",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className="relative mb-4">
                        <Logo collapsed={isCollapsed} />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={closeMobileSidebar}
                            className="lg:hidden absolute top-4 right-4"
                        >
                            <X className="h-5 w-5" />
                        </Button>

                        {!isCollapsed && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="hidden lg:flex absolute top-4 right-4"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {/* Expand button when collapsed */}
                    {isCollapsed && (
                        <div className="flex justify-center mb-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="text-sushigo-navy dark:text-sushigo-cream"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-3">
                        <ul className="space-y-1">
                            {menuItemsResolved.map((item) => {
                                const access = resolveAccess(item);
                                if (access === 'hidden') return null;
                                return renderMenuItem(item, access);
                            })}
                        </ul>
                    </nav>

                    {/* Footer */}
                    <div className="border-t">
                        {!isCollapsed && (
                            <div className="p-2">
                                <BranchSwitcher />
                            </div>
                        )}

                        <div className="p-4">
                            {!isCollapsed ? (
                                <div className="text-xs text-muted-foreground">
                                    <p>© 2025 SushiGo</p>
                                    <p>v1.0.0</p>
                                </div>
                            ) : (
                                <div className="text-xs text-center text-muted-foreground">
                                    <p>v1.0</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
